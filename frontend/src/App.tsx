import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type { EngagementChallenge, Outfit, Screen, SimilarityResult, RewardData, SavedFit, StyleEntryPoint, StylePreference, SustainableAction, UserProgress, WardrobeCategory, WardrobeItem } from './types'
import { analysisService } from './services/analysisService'
import { INITIAL_PROGRESS, progressService } from './services/progressService'
import { preferencesService } from './services/preferencesService'
import { savedFitsService } from './services/savedFitsService'
import { syncWardrobe, wardrobeService } from './services/wardrobeService'
import { outfitService } from './services/outfitService'
import { generateHomeOutfit, replaceHomeOutfitSlot } from './services/homeOutfitService'
import HomeScreen from './screens/HomeScreen'
import UploadScreen from './screens/UploadScreen'
import AnalysisScreen from './screens/AnalysisScreen'
import SimilarityScreen from './screens/SimilarityScreen'
import StyleScreen from './screens/StyleScreen'
import RewardScreen from './screens/RewardScreen'
import CompareFitsScreen from './screens/CompareFitsScreen'
import SavedFitsScreen from './screens/SavedFitsScreen'
import WardrobeScreen from './screens/WardrobeScreen'
import AddWardrobeScreen from './screens/AddWardrobeScreen'
import MarketScreen from './screens/MarketScreen'
export default function App() {
  const [screen,setScreen]=useState<Screen>('home')
  const [uploadedImageUrl,setUploadedImageUrl]=useState<string|null>(null)
  const [uploadedFile,setUploadedFile]=useState<File|null>(null)
  const [similarityResult,setSimilarityResult]=useState<SimilarityResult | null>(null)
  const [analysisStatus,setAnalysisStatus]=useState<'idle'|'analyzing'|'error'>('idle')
  const [analysisError,setAnalysisError]=useState<string|null>(null)
  const [rewardData,setRewardData]=useState<RewardData | null>(null)
  const [progress,setProgress]=useState<UserProgress>(INITIAL_PROGRESS)
  const [challenges,setChallenges]=useState<EngagementChallenge[]>([])
  const [wardrobe,setWardrobe]=useState<WardrobeItem[]>([])
  const [savedFits,setSavedFits]=useState<SavedFit[]>([])
  const [stylePreferences,setStylePreferences]=useState<StylePreference[]>([])
  const [styleEntryPoint,setStyleEntryPoint]=useState<StyleEntryPoint>('home-avatar')
  const [initialOutfit,setInitialOutfit]=useState<Outfit | undefined>()
  const [initialSavedFitId,setInitialSavedFitId]=useState<string | undefined>()
  const [recommendedOutfits,setRecommendedOutfits]=useState<Outfit[]>([])
  const [recommendationsLoading,setRecommendationsLoading]=useState(false)
  const [homeOutfit,setHomeOutfit]=useState<Outfit | undefined>()
  const [marketFilter,setMarketFilter]=useState<{ category?: WardrobeCategory; color?: string }>({})
  const [marketListingItem,setMarketListingItem]=useState<WardrobeItem | undefined>()
  const similarityRequestIdRef = useRef(0)
  const homeShuffleVariationRef = useRef(0)
  const engagementLoadedRef = useRef(false)
  const wearInFlightRef = useRef(false)
  const activeWardrobe = useMemo(() => wardrobe.filter(item => item.isActive !== false), [wardrobe])

  useEffect(()=>{
    let active = true
    void Promise.all([wardrobeService.list(), savedFitsService.list(), preferencesService.list(), progressService.get()]).then(([wardrobeResult, savedFitsResult, preferencesResult, progressResult])=>{
      if (!active) return
      if (wardrobeResult.data) setWardrobe(wardrobeResult.data)
      if (savedFitsResult.data) setSavedFits(savedFitsResult.data)
      if (preferencesResult.data) setStylePreferences(preferencesResult.data)
      if (progressResult.data) setProgress(progressResult.data)
    })
    return ()=>{ active = false }
  },[])

  useEffect(() => {
    if (engagementLoadedRef.current || !wardrobe.length) return
    engagementLoadedRef.current = true
    void progressService.getEngagement(wardrobe).then(result => {
      if (result.data) setChallenges(result.data.challenges.filter(challenge => !challenge.completed))
    })
  }, [wardrobe])

  useEffect(() => {
    setHomeOutfit(current => {
      if (!activeWardrobe.length) return undefined
      const ownedIds = new Set(activeWardrobe.map(item => item.id))
      if (current?.items?.length && current.items.every(item => ownedIds.has(item.id))) return current
      return generateHomeOutfit(activeWardrobe, undefined, homeShuffleVariationRef.current)
    })
  }, [activeWardrobe])

  const resetSimilarityAttempt = useCallback(() => {
    similarityRequestIdRef.current += 1
    setUploadedFile(null)
    setUploadedImageUrl(null)
    setSimilarityResult(null)
    setAnalysisStatus('idle')
    setAnalysisError(null)
  }, [])

  const runAnalysis=useCallback(()=>{
    if (!uploadedFile || !uploadedImageUrl) {
      setAnalysisStatus('error')
      setAnalysisError('Choose an image before checking your wardrobe.')
      return
    }

    const requestId = ++similarityRequestIdRef.current
    const file = uploadedFile
    const image = uploadedImageUrl
    setAnalysisStatus('analyzing')
    setAnalysisError(null)
    void analysisService.analyze({file,image,wardrobe:activeWardrobe}).then(result=>{
      if (requestId !== similarityRequestIdRef.current) return
      if (result.data) {
        setSimilarityResult(result.data)
        setAnalysisStatus('idle')
        setScreen('similarity')
        return
      }
      setAnalysisStatus('error')
      setAnalysisError(result.error?.message ?? 'Could not check this item. Try again.')
    }).catch(() => {
      if (requestId !== similarityRequestIdRef.current) return
      setAnalysisStatus('error')
      setAnalysisError('Could not check this item. Try again.')
    })
  },[uploadedFile,uploadedImageUrl,activeWardrobe])

  const requestRecommendations=useCallback(async (entryContext:StyleEntryPoint, requiredItemId?:string, excludeItemCombinations:string[][] = [], preferences = stylePreferences)=>{
    setRecommendationsLoading(true)
    const result = await outfitService.recommend({wardrobe:activeWardrobe,preferences,entryContext,count:3,requiredItemId,excludeItemCombinations})
    setRecommendationsLoading(false)
    return result.data?.outfits ?? []
  },[activeWardrobe,stylePreferences])

  const beginRecommendations=useCallback((entryContext:StyleEntryPoint, requiredItemId?:string, preferences = stylePreferences)=>{
    setRecommendedOutfits([])
    void requestRecommendations(entryContext,requiredItemId,[],preferences).then(setRecommendedOutfits)
  },[requestRecommendations,stylePreferences])

  const navigate=useCallback((s:Screen)=>{
    if (s === 'upload') {
      resetSimilarityAttempt()
      setScreen('upload')
      return
    }
    if(s==='style') {
      const entryPoint:StyleEntryPoint = screen==='similarity'?'similarity':'home-avatar'
      const requiredItemId = entryPoint==='similarity' ? similarityResult?.closestMatch?.id : undefined
      setStyleEntryPoint(entryPoint)
      setInitialOutfit(undefined)
      setInitialSavedFitId(undefined)
      setScreen('style')
      beginRecommendations(entryPoint,requiredItemId)
      return
    }
    if(s==='analysis') {
      setScreen('analysis')
      runAnalysis()
      return
    }
    if (s === 'market') setMarketListingItem(undefined)
    setScreen(s)
  },[screen,similarityResult,runAnalysis,beginRecommendations,resetSimilarityAttempt])
  const handleImageSelected=useCallback((file:File,url:string)=>{
    resetSimilarityAttempt()
    setUploadedFile(file)
    setUploadedImageUrl(url)
    setSimilarityResult(null)
    setAnalysisStatus('idle')
    setAnalysisError(null)
  },[resetSimilarityAttempt])
  const shuffleHomeOutfit = useCallback(() => {
    homeShuffleVariationRef.current += 1
    setHomeOutfit(current => generateHomeOutfit(activeWardrobe, current, homeShuffleVariationRef.current))
  }, [activeWardrobe])
  const updateHomeOutfitSlot = useCallback((item: WardrobeItem) => {
    setHomeOutfit(current => replaceHomeOutfitSlot(current, item))
  }, [])
  const handleWearThis=useCallback((outfit: Outfit | undefined)=>{
    if (!outfit || wearInFlightRef.current) return
    wearInFlightRef.current = true
    void progressService.recordOutfitWear(outfit, wardrobe).then(result=>{
      if (!result.data) return
      syncWardrobe(result.data.wardrobe)
      setWardrobe(result.data.wardrobe)
      setProgress(result.data.progress)
      setChallenges(result.data.challenges)
      setRewardData(result.data.reward)
      setScreen('reward')
    }).finally(()=>{ wearInFlightRef.current = false })
  },[wardrobe])
  const handleSustainableAction=useCallback((itemId:string, action:SustainableAction, listingMessage?: string)=>{
    void progressService.recordSustainableAction(itemId, action, wardrobe).then(result=>{
      if (!result.data) return
      syncWardrobe(result.data.wardrobe)
      setWardrobe(result.data.wardrobe)
      setProgress(result.data.progress)
      setChallenges(result.data.challenges)
      setRewardData(listingMessage ? { ...result.data.reward, messages: [listingMessage, ...(result.data.reward.messages ?? [])] } : result.data.reward)
      setScreen('reward')
    })
  },[wardrobe])
  const listWardrobeItem=useCallback((item: WardrobeItem, action: Extract<SustainableAction, 'sell' | 'trade'>, details: { price?: number; size: string; condition: string; tradePreference?: string })=>{
    setMarketListingItem(item)
    setScreen('market')
  },[])
  const completeMarketListing=useCallback((listing: import('./types').MarketListing)=>{
    if (!listing.wardrobeItemId) return
    handleSustainableAction(listing.wardrobeItemId, listing.listingType === 'trade' ? 'trade' : 'sell', listing.listingType === 'trade' ? 'Traded' : 'Sold')
  },[handleSustainableAction])
  const addWardrobeItem=useCallback((item:WardrobeItem)=>{void wardrobeService.create({ ...item, firstAddedAt: item.firstAddedAt ?? new Date().toISOString(), isActive: item.isActive ?? true }).then(result=>{
    if (!result.data) return
    const createdItem = result.data
    setWardrobe(items=>[createdItem,...items])
  })},[])
  const saveFit=useCallback((fit:SavedFit)=>{void savedFitsService.create(fit).then(result=>{
    if (!result.data) return
    const createdFit = result.data
    setSavedFits(fits=>[createdFit,...fits])
  })},[])
  const removeSavedFit=useCallback((id:string)=>{void savedFitsService.remove(id).then(result=>{
    if (!result.error) setSavedFits(fits=>fits.filter(fit=>fit.id!==id))
  })},[])
  const removeWardrobeItem=useCallback((id:string)=>{
    void wardrobeService.remove(id).then(result=>{
      if (result.error) return
      setWardrobe(items=>items.filter(item=>item.id!==id))
      setSavedFits(fits=>{
        const affected = fits.filter(fit => (fit.items ?? [fit.top,fit.outerwear,fit.bottom,fit.shoes].filter(Boolean)).some(item=>item?.id===id))
        affected.forEach(fit => { void savedFitsService.remove(fit.id) })
        return fits.filter(fit=>!affected.some(removed=>removed.id===fit.id))
      })
      setSimilarityResult(current=>current?.closestMatch?.id===id ? null : current)
      setRecommendedOutfits(outfits=>outfits.filter(outfit=>!(outfit.items ?? []).some(item=>item.id===id)))
      setInitialOutfit(current=>current && !(current.items ?? []).some(item=>item.id===id) ? current : undefined)
    })
  },[])
  const openStyle=useCallback((outfit:Outfit | undefined, entryPoint:StyleEntryPoint, savedFitId?:string, preferences = stylePreferences)=>{
    setInitialOutfit(outfit)
    setInitialSavedFitId(savedFitId)
    setStyleEntryPoint(entryPoint)
    setScreen('style')
    beginRecommendations(entryPoint,undefined,preferences)
  },[beginRecommendations,stylePreferences])
  const recordPreference=useCallback((options:[Outfit,Outfit],selectedOutfitId:string)=>{
    const preference: StylePreference = {id:crypto.randomUUID(),createdAt:new Date().toISOString(),comparisonId:crypto.randomUUID(),selectedOutfitId,options}
    setStylePreferences(preferences=>[preference,...preferences])
    void preferencesService.record(preference)
    return preference
  },[])

  return <div className="min-h-full bg-[#f7f5f2]"><div className="w-full max-w-[430px] min-h-full mx-auto relative">
    {screen==='home'&&<HomeScreen onNavigate={navigate} items={activeWardrobe} progress={progress} challenges={challenges} outfit={homeOutfit} savedFits={savedFits} onSaveFit={saveFit} onRemoveSavedFit={removeSavedFit} onShuffleFit={shuffleHomeOutfit} onSelectOutfitItem={updateHomeOutfitSlot} onWearThis={()=>handleWearThis(homeOutfit)}/>} 
    {screen==='upload'&&<UploadScreen onNavigate={navigate} selectedImage={uploadedImageUrl} onImageSelected={handleImageSelected}/>} 
    {screen==='analysis'&&<AnalysisScreen onNavigate={navigate} status={analysisStatus} errorMessage={analysisError} onRetry={runAnalysis}/>} 
    {screen==='similarity'&&similarityResult&&<SimilarityScreen onNavigate={navigate} result={similarityResult} onBrowseSecondhand={()=>{setMarketListingItem(undefined);setMarketFilter({category: similarityResult.uploadedItem.category, color: similarityResult.uploadedItem.color});setScreen('market')}}/>}
    {screen==='style'&&<StyleScreen onNavigate={navigate} onWearThis={handleWearThis} entryPoint={styleEntryPoint} initialOutfit={initialOutfit} initialSavedFitId={initialSavedFitId} savedFits={savedFits} recommendations={recommendedOutfits} recommendationsLoading={recommendationsLoading} onRequestMore={(excluded)=>requestRecommendations(styleEntryPoint,styleEntryPoint==='similarity'?similarityResult?.closestMatch?.id:undefined,excluded)} onSaveFit={saveFit} onRemoveSavedFit={removeSavedFit}/>} 
    {screen==='reward'&&rewardData&&<RewardScreen onNavigate={navigate} streak={progress.streak} rewardData={rewardData}/>} 
    {screen==='compare'&&<CompareFitsScreen onNavigate={navigate} items={activeWardrobe} onPreference={(options,selectedOutfitId)=>{recordPreference(options,selectedOutfitId)}} onStyleLook={(outfit)=>openStyle(outfit,'comparison')}/>} 
    {screen==='saved'&&<SavedFitsScreen onNavigate={navigate} fits={savedFits} onOpenFit={(fit)=>openStyle(fit,'saved-fit',fit.id)} onRemoveFit={removeSavedFit}/>}
    {screen==='wardrobe'&&<WardrobeScreen onNavigate={navigate} items={wardrobe} onSustainableAction={handleSustainableAction} onRemoveItem={removeWardrobeItem} onListItem={listWardrobeItem}/>}
    {screen==='add-wardrobe'&&<AddWardrobeScreen onNavigate={navigate} onAddItem={addWardrobeItem}/>} 
    {screen==='market'&&<MarketScreen onNavigate={navigate} initialCategory={marketFilter.category} initialColor={marketFilter.color} items={activeWardrobe} listingItem={marketListingItem} onCompleteListing={completeMarketListing}/>}
  </div></div>
}
