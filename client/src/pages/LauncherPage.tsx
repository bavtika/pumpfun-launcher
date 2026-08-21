import { useEffect } from "react";
import { Topbar } from "../components/layout/Topbar";
import { BottomBar } from "../components/layout/BottomBar";
import { Workspace } from "../components/layout/Workspace";
import { PageOverlay } from "../components/layout/Window";
import { DeployModal } from "../components/form/DeployModal";
import { OptionPopovers } from "../components/form/OptionPopovers";
import { Toast } from "../components/ui/Toast";
import { WalletsPage } from "./WalletsPage";
import { EarningsPage } from "./EarningsPage";
import { SettingsPage } from "./SettingsPage";
import { TradePanels } from "../components/trade/TradePanels";
import { useUiStore } from "../stores/ui";
import { useWalletsStore } from "../stores/wallets";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useDeployFlow } from "../hooks/useDeployFlow";

export function LauncherPage() {
  const activePage = useUiStore((s) => s.activePage);
  const loadWallets = useWalletsStore((s) => s.loadWallets);
  const { deployIntent, confirmDeploy } = useDeployFlow();

  useKeyboardShortcuts({ onDeployIntent: deployIntent, onConfirmDeploy: confirmDeploy });

  useEffect(() => {
    void loadWallets();
  }, [loadWallets]);

  return (
    <div className="h-full">
      <Topbar />
      <Workspace />
      <BottomBar />

      {activePage === "wallets" && (
        <PageOverlay>
          <WalletsPage />
        </PageOverlay>
      )}
      {activePage === "earnings" && (
        <PageOverlay>
          <EarningsPage />
        </PageOverlay>
      )}
      {activePage === "settings" && (
        <PageOverlay>
          <SettingsPage />
        </PageOverlay>
      )}

      <DeployModal onConfirm={confirmDeploy} />
      <OptionPopovers />
      <TradePanels />
      <Toast />
    </div>
  );
}
