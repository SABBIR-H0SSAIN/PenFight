/** Recording, impact slow motion and replay timing, in seconds. */
export const playbackConfig = {
  recordInterval: 1 / 60,
  impactLead: 0.025,
  impactDuration: 0.13,
  impactSpeed: 0.75,
  // AI Battle scales recorded pen motion independently of character timing.
  battleAnimationSpeedLimit: 1.5,
  battleThinkLimit: 0.3,
  battleRoundIntro: 0.3,
  battleRoundEnd: 0.6,
  battleBetweenShots: 0.08,
  replayLead: 0.4,
  replayTail: 0.55,
};
