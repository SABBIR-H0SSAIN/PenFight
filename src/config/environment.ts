/** Literal accesses let Next.js inline public values into the browser bundle. */
export function readEnvironmentOverrides() {
  return {
    settings: {
      name: process.env.NEXT_PUBLIC_GAME_PLAYER_NAME,
      vol: process.env.NEXT_PUBLIC_GAME_VOLUME,
      amb: process.env.NEXT_PUBLIC_GAME_AMBIENCE,
      quality: process.env.NEXT_PUBLIC_GAME_QUALITY,
      tableSurface: process.env.NEXT_PUBLIC_GAME_TABLE_SURFACE,
      follow: process.env.NEXT_PUBLIC_GAME_FOLLOW,
      replay: process.env.NEXT_PUBLIC_GAME_REPLAY,
      slowmo: process.env.NEXT_PUBLIC_GAME_SLOWMO,
      fps: process.env.NEXT_PUBLIC_GAME_FPS,
      guide: process.env.NEXT_PUBLIC_GAME_AIM_GUIDE,
      friction: process.env.NEXT_PUBLIC_GAME_FRICTION,
      real: process.env.NEXT_PUBLIC_GAME_REALISM,
    },
    preferences: {
      vs: {
        pen: process.env.NEXT_PUBLIC_GAME_DEFAULT_PEN,
        difficulty: process.env.NEXT_PUBLIC_GAME_DIFFICULTY,
      },
      train: {
        pen: process.env.NEXT_PUBLIC_GAME_DEFAULT_PEN,
        difficulty: process.env.NEXT_PUBLIC_GAME_DIFFICULTY,
      },
    },
    matches: {
      versusGoal: process.env.NEXT_PUBLIC_GAME_VS_GOAL,
      trainingGoal: process.env.NEXT_PUBLIC_GAME_TRAINING_GOAL,
      aiGoal: process.env.NEXT_PUBLIC_GAME_AI_GOAL,
    },
    camera: { defaultZoom: process.env.NEXT_PUBLIC_GAME_CAMERA_ZOOM },
  };
}
