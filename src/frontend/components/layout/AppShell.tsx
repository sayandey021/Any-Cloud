import React from 'react';
import { useUiStore } from '../../stores/uiStore';
import { CloudAccountsPage } from '../clouds/CloudAccountsPage';
import { AddCloudWizard } from '../clouds/AddCloudWizard';
import { HomeDashboard } from '../dashboard/HomeDashboard';
import { UnifiedFileExplorer } from '../explorer/UnifiedFileExplorer';
import { FilePropertiesModal } from '../explorer/FilePropertiesModal';
import { CrossCloudTransferModal } from '../transfers/CrossCloudTransferModal';
import { TransfersPage } from '../transfers/TransfersPage';
import { SettingsPage } from '../settings/SettingsPage';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ToastContainer } from '../ui/Toast';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { TitleBar } from './TitleBar';

export const AppShell: React.FC = () => {
  const { activePage, activeModal, closeModal, selectedFileForProperties, filesToTransfer } =
    useUiStore();

  const renderContent = () => {
    switch (activePage) {
      case 'home':
        return <HomeDashboard />;
      case 'clouds':
        return <CloudAccountsPage />;
      case 'files':
      case 'recent':
      case 'favorites':
      case 'trash':
      case 'shared':
        return <UnifiedFileExplorer mode={activePage} />;
      case 'transfers':
        return <TransfersPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <HomeDashboard />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground select-none">
      {/* Custom Window Title Bar */}
      <TitleBar />

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {activePage !== 'settings' && <Header />}
          <main className="flex-1 overflow-hidden relative flex flex-col">{renderContent()}</main>
          <StatusBar />
        </div>
      </div>

      {/* Global Modals */}
      <AddCloudWizard isOpen={activeModal === 'add-cloud'} onClose={closeModal} />

      <CrossCloudTransferModal
        isOpen={activeModal === 'transfer'}
        onClose={closeModal}
        files={filesToTransfer}
      />

      {selectedFileForProperties && (
        <FilePropertiesModal
          isOpen={activeModal === 'properties'}
          onClose={closeModal}
          file={selectedFileForProperties}
        />
      )}

      {/* Toast Notification & Confirmation Layers */}
      <ToastContainer />
      <ConfirmDialog />
    </div>
  );
};
