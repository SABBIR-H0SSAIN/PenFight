import { GameCanvas } from "@/features/game/ui/GameCanvas";
import { GameHeader } from "@/features/game/ui/GameHeader";

export default function HomePage() {
  return (
    <main className="app-shell">
      <GameHeader />
      <GameCanvas />
    </main>
  );
}
