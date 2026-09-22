export const experienceConfig = {
  girlfriendName: 'NOMBRE',
  introText: 'Tengo alguito para ti mi feota...',
  introActionDesktop: 'Haz clic para comenzar',
  introActionMobile: 'Toca para comenzar',
  finalMessage: 'te amo',
  specialDate: '',
} as const

export const TIMELINE_MILESTONES = {
  fieldEnd: 2.0,
  impulse1Start: 2.0,
  impulse1End: 4.0,
  earthDepartureEnd: 6.8,
  cruiseEnd: 9.7,
  sunAppearStart: 9.7,
  sunAppearEnd: 11.7,
  impulse2Start: 11.7,
  impulse2End: 13.7,
  approachEnd: 15.2,
  sunflowerRevealStart: 13.7,
  sunflowerRevealEnd: 16.5,
  finalMessageStart: 16.5,
  totalDuration: 18.0,
} as const

const DURATION = TIMELINE_MILESTONES.totalDuration

export const NORMALIZED_MILESTONES = {
  fieldEnd: 0.11,
  impulse1Start: 0.11,
  impulse1End: 0.22,
  earthDepartureEnd: 0.38,
  cruiseEnd: 0.54,
  sunAppearStart: 0.54,
  sunAppearEnd: 0.65,
  impulse2Start: 0.65,
  impulse2End: 0.76,
  approachEnd: 0.84,
  sunflowerRevealStart: 0.76,
  sunflowerRevealEnd: 0.92,
  finalMessageStart: 0.92,
  total: 1.0,
} as const

export const timelineConfig = {
  ascendEnd: TIMELINE_MILESTONES.impulse1End,
  spaceEnd: TIMELINE_MILESTONES.earthDepartureEnd,
  warpEnd: TIMELINE_MILESTONES.sunAppearEnd,
  approachEnd: TIMELINE_MILESTONES.impulse2End,
  revealEnd: TIMELINE_MILESTONES.finalMessageStart,
  finalEnd: TIMELINE_MILESTONES.totalDuration,
} as const
