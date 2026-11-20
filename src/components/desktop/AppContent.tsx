import type { AppId } from "@/config/apps";
import type { ThemeId } from "@/config/themes";
import GameLauncher from "@/components/games/GameLauncher";
import ThemeSelector from "./ThemeSelector";

export default function AppContent({
  id,
  themeId,
  onTheme,
}: {
  id: AppId;
  themeId: ThemeId;
  onTheme: (id: ThemeId) => void;
}) {
  if (id === "config") return <ThemeSelector themeId={themeId} onTheme={onTheme} />;
  return <GameLauncher themeId={themeId} onTheme={onTheme} />;
}
