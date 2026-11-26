export const SLOT_SAVE_PREFIX = 'industryGlobeSave_';
export const LEGACY_SLOT_SAVE_PREFIX = 'actorEmpireSave_';
export const SINGLE_SAVE_KEY = 'industryGlobeSave';
export const LEGACY_SINGLE_SAVE_KEY = 'actorEmpireSave';
export const WHATS_NEW_KEY = 'industryGlobeSeenWhatsNewVersion';
export const LEGACY_WHATS_NEW_KEY = 'actorEmpireSeenWhatsNewVersion';

export const slotSaveKey = (slot: number) => `${SLOT_SAVE_PREFIX}${slot}`;
export const legacySlotSaveKey = (slot: number) => `${LEGACY_SLOT_SAVE_PREFIX}${slot}`;
export const slotMetaKey = (slot: number) => `${SLOT_SAVE_PREFIX}${slot}_meta`;
