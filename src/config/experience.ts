export const experienceConfig = {
  girlfriendName: 'NOMBRE',
  introText: 'Tengo un viaje para ti…',
  introActionDesktop: 'Haz clic para comenzar',
  introActionMobile: 'Toca para comenzar',
  finalMessage: 'te amo',
  specialDate: '',
} as const

export const TIMELINE_MILESTONES = {
  fieldEnd: 2.0,
  impulse1Start: 2.0,
  impulse1End: 3.6,
  earthDepartureEnd: 5.3,
  cruiseEnd: 9.8,
  sunAppearStart: 9.8,
  sunAppearEnd: 11.3,
  impulse2Start: 11.3,
  impulse2End: 12.6,
  approachEnd: 15.0,
  sunflowerRevealStart: 12.6,
  sunflowerRevealEnd: 16.5,
  finalMessageStart: 16.5,
  totalDuration: 18.0,
} as const

const DURATION = TIMELINE_MILESTONES.totalDuration

export const NORMALIZED_MILESTONES = {
  fieldEnd: TIMELINE_MILESTONES.fieldEnd / DURATION,
  impulse1Start: TIMELINE_MILESTONES.impulse1Start / DURATION,
  impulse1End: TIMELINE_MILESTONES.impulse1End / DURATION,
  earthDepartureEnd: TIMELINE_MILESTONES.earthDepartureEnd / DURATION,
  cruiseEnd: TIMELINE_MILESTONES.cruiseEnd / DURATION,
  sunAppearStart: TIMELINE_MILESTONES.sunAppearStart / DURATION,
  sunAppearEnd: TIMELINE_MILESTONES.sunAppearEnd / DURATION,
  impulse2Start: TIMELINE_MILESTONES.impulse2Start / DURATION,
  impulse2End: TIMELINE_MILESTONES.impulse2End / DURATION,
  approachEnd: TIMELINE_MILESTONES.approachEnd / DURATION,
  sunflowerRevealStart: TIMELINE_MILESTONES.sunflowerRevealStart / DURATION,
  sunflowerRevealEnd: TIMELINE_MILESTONES.sunflowerRevealEnd / DURATION,
  finalMessageStart: TIMELINE_MILESTONES.finalMessageStart / DURATION,
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
