const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getClosetItems(user_id) {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', user_id)
    .order('date_added', { ascending: false });

  if (error) throw error;
  return data;
}

async function checkSimilarity(user_id, newItem, excludeItemId = null) {
  const { data: existingItems, error } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', user_id);

  if (error) throw error;

  let bestMatch = null;
  let bestScore = 0;

  for (const item of existingItems) {
    if (excludeItemId && item.id === excludeItemId) continue;

    let score = 0;

    if (item.category?.toLowerCase() === newItem.category?.toLowerCase()) {
      score += 50;
    }

    if (item.color?.toLowerCase() === newItem.color?.toLowerCase()) {
      score += 30;
    }

    const itemTags = item.style_tags || [];
    const newTags = newItem.style_tags || [];
    const overlap = itemTags.filter((tag) =>
      newTags.map((t) => t.toLowerCase()).includes(tag.toLowerCase())
    ).length;
    score += Math.min(overlap * 5, 20);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }

  return { bestMatch, score: bestScore };
}

async function tagItemWithAI(image_url) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Look at this clothing item and respond with ONLY a JSON object,
no markdown, no explanation, in this exact shape:
{"category": "...", "color": "...", "style_tags": ["...", "..."], "condition_notes": "..."}
category should be one of: top, bottom, dress, jacket, shoes, accessory.
style_tags should be 2-4 short lowercase words (e.g. "casual", "streetwear", "formal", "summer").
condition_notes should note visible wear/damage, or "good condition" if none visible.`,
          },
          { type: 'image_url', image_url: { url: image_url } },
        ],
      },
    ],
    max_tokens: 200,
  });

  const raw = response.choices[0].message.content.trim();
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

const DUPLICATE_THRESHOLD = 80;

async function addItem(user_id, image_url, manualFields = {}, confirm = false) {
  let tags = manualFields;
  let tags_source = 'manual';

  if (!manualFields.category || !manualFields.color) {
    tags = await tagItemWithAI(image_url);
    tags_source = 'ai';
  }

  const { bestMatch, score } = await checkSimilarity(user_id, tags);

  if (score >= DUPLICATE_THRESHOLD && !confirm) {
    return {
      inserted: false,
      duplicateWarning: true,
      message: `This looks similar to an item already in your closet (${score}% match).`,
      matchedItem: bestMatch,
      proposedTags: tags,
    };
  }

  const { data, error } = await supabase
    .from('items')
    .insert({
      user_id,
      image_url,
      category: tags.category,
      color: tags.color,
      style_tags: tags.style_tags,
      condition_notes: tags.condition_notes || null,
      tags_source,
      last_worn_fake: new Date().toISOString().slice(0, 10),
      is_duplicate_of: score >= DUPLICATE_THRESHOLD ? bestMatch.id : null,
    })
    .select()
    .single();

  if (error) throw error;
  return { inserted: true, item: data };
}

async function checkin(user_id, item_ids) {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user_id)
    .single();

  if (userError) throw userError;

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  let newStreak;
  if (user.last_checkin_date === yesterday) {
    newStreak = user.streak_count + 1;
  } else if (user.last_checkin_date === today) {
    newStreak = user.streak_count;
  } else {
    newStreak = 1;
  }

  const xpGain = user.last_checkin_date === today ? 0 : 10;

  const { data, error } = await supabase
    .from('users')
    .update({
      xp: user.xp + xpGain,
      streak_count: newStreak,
      last_checkin_date: today,
    })
    .eq('id', user_id)
    .select()
    .single();

  if (error) throw error;

  if (item_ids && item_ids.length > 0) {
    await supabase
      .from('items')
      .update({ last_worn_fake: today })
      .in('id', item_ids);
  }

  return data;
}

async function buycheckResult(user_id, decision) {
  const bonusXp = decision === 'skip' || decision === 'bought secondhand' ? 20 : 0;

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('xp')
    .eq('id', user_id)
    .single();

  if (userError) throw userError;

  const { data, error } = await supabase
    .from('users')
    .update({ xp: user.xp + bonusXp })
    .eq('id', user_id)
    .select()
    .single();

  if (error) throw error;
  return { user: data, xpAwarded: bonusXp };
}

async function getLeaderboard() {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, xp, streak_count')
    .order('xp', { ascending: false });

  if (error) throw error;
  return data;
}

async function getNeglectedItems(user_id) {
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  const cutoffDate = twoMonthsAgo.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', user_id)
    .lt('last_worn_fake', cutoffDate);

  if (error) throw error;
  return data;
}

async function createChallenge(user_id, item_id, type = 'wear') {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 5);

  const { data, error } = await supabase
    .from('challenges')
    .insert({
      user_id,
      item_id,
      type,
      deadline: deadline.toISOString().slice(0, 10),
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function resolveChallenge(challenge_id, outcome) {
  const { data: challenge, error: fetchError } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', challenge_id)
    .single();

  if (fetchError) throw fetchError;

  const { error: updateError } = await supabase
    .from('challenges')
    .update({ status: 'completed' })
    .eq('id', challenge_id);

  if (updateError) throw updateError;

  if (outcome === 'worn') {
    const today = new Date().toISOString().slice(0, 10);
    await supabase
      .from('items')
      .update({ last_worn_fake: today })
      .eq('id', challenge.item_id);

    const { data: user } = await supabase
      .from('users')
      .select('xp')
      .eq('id', challenge.user_id)
      .single();

    await supabase
      .from('users')
      .update({ xp: user.xp + 15 })
      .eq('id', challenge.user_id);
  }

  return { challenge_id, outcome, resolved: true };
}

function generateSecondhandLink(item) {
  const query = `${item.color} ${item.category}`.trim();
  const encoded = encodeURIComponent(query);
  return `https://www.carousell.sg/search/${encoded}`;
}

async function flagWornOut(item_id, condition_notes) {
  const { data, error } = await supabase
    .from('items')
    .update({ condition_notes })
    .eq('id', item_id)
    .select()
    .single();

  if (error) throw error;

  return {
    item: data,
    secondhandLink: generateSecondhandLink(data),
  };
}

module.exports = {
  getClosetItems,
  checkSimilarity,
  tagItemWithAI,
  addItem,
  checkin,
  buycheckResult,
  getLeaderboard,
  getNeglectedItems,
  createChallenge,
  resolveChallenge,
  generateSecondhandLink,
  flagWornOut,
};
