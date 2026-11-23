import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  ArrowUpDown,
  CheckCircle2,
  Database,
  ExternalLink,
  Folder,
  FolderOpen,
  Globe,
  HardDrive,
  Key,
  Lock,
  Search,
  Server,
  Shield,
  SlidersHorizontal,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useHorizontalScroll } from '../../lib/useHorizontalScroll';
import { tauriApi } from '../../services/tauriClient';
import { useAccountStore } from '../../stores/accountStore';
import { useUiStore } from '../../stores/uiStore';
import { CloudProviderId, ProviderMetadata } from '../../types/cloud';
import { ProviderIcon } from '../ui/Icons';
import { Modal } from '../ui/Modal';

type CategoryFilter = 'all' | 'popular' | 'drives' | 'object' | 'protocols' | 'media';
type AuthFilter = 'all' | 'oauth' | 'api' | 'credentials' | 'protocols' | 'quota';
type SortOption = 'default' | 'name-asc' | 'name-desc' | 'oauth-first' | 'quota-first';

const POPULAR_IDS = [
  'local',
  'gdrive',
  'onedrive',
  'dropbox',
  'box',
  'mega',
  'pcloud',
  'protondrive',
  'iclouddrive',
  'googlephotos',
];

const DRIVES_IDS = [
  'zohoworkdrive',
  'kdrive',
  'koofr',
  'yandex',
  'mailru',
  'jottacloud',
  'opendrive',
  'hidrive',
  'linkbox',
  'pikpak',
  'huaweidrive',
  'filen',
  'internxt',
  'seafile',
  'sharefile',
  'sugarsync',
  'filescom',
  'drime',
];

const OBJECT_IDS = [
  's3',
  'b2',
  'r2',
  'googlecloudstorage',
  'azureblob',
  'azurefiles',
  'digitaloceanspaces',
  'wasabi',
  'minio',
  'alibabacloud',
  'oracleobjectstorage',
  'swift',
  'qingstor',
  'netstorage',
  'storj',
  'sia',
  'filebase',
  'filelu',
];

const PROTOCOLS_IDS = ['sftp', 'ftp', 'webdav', 'smb', 'http', 'hdfs'];

const MEDIA_IDS = [
  'cloudinary',
  'imagekit',
  'fichier',
  'pixeldrain',
  'putio',
  'premiumizeme',
  'gofile',
  'internetarchive',
];

const isApiProvider = (id: string) => {
  return (
    OBJECT_IDS.includes(id) ||
    ['cloudinary', 'imagekit', 'fichier', 'pixeldrain', 'gofile'].includes(id)
  );
};

const isCredentialsProvider = (id: string) => {
  return [
    'mega',
    'protondrive',
    'iclouddrive',
    'koofr',
    'linkbox',
    'mailru',
    'pikpak',
    'filen',
    'internxt',
    'seafile',
    'sugarsync',
    'opendrive',
    'drime',
    'filescom',
  ].includes(id);
};

const isOAuthProvider = (p: ProviderMetadata) => {
  return p.capabilities.supports_oauth && p.id !== 'local' && !OBJECT_IDS.includes(p.id);
};

const isProtocolProvider = (id: string) => {
  return PROTOCOLS_IDS.includes(id);
};

export const AddCloudWizard: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { providers, loadProviders, addAccount } = useAccountStore();
  const { addToast, setActivePage } = useUiStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedProvider, setSelectedProvider] = useState<ProviderMetadata | null>(null);
  const [accountLabel, setAccountLabel] = useState('');
  const [remoteName, setRemoteName] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [authFilter, setAuthFilter] = useState<AuthFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const categoryChipsRef = useHorizontalScroll<HTMLDivElement>();
  const authChipsRef = useHorizontalScroll<HTMLDivElement>();

  // Local storage path
  const [localPath, setLocalPath] = useState('');

  // Credentials / Configuration
  const [endpoint, setEndpoint] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [additionalParam1, setAdditionalParam1] = useState('');
  const [additionalParam2, setAdditionalParam2] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [zohoRegion, setZohoRegion] = useState('com');

  React.useEffect(() => {
    if (isOpen) {
      loadProviders();
      setStep(1);
      setSelectedProvider(null);
      setAccountLabel('');
      setRemoteName('');
      setLocalPath('');
      setEndpoint('');
      setAccessKey('');
      setSecretKey('');
      setAdditionalParam1('');
      setAdditionalParam2('');
      setManualToken('');
      setZohoRegion('com');
      setSearchQuery('');
      setCategoryFilter('all');
      setAuthFilter('all');
      setSortBy('default');
      setShowAdvanced(false);
      setErrorMsg(null);
      setStatusText(null);
    }
  }, [isOpen, loadProviders]);

  const handleSelectProvider = (prov: ProviderMetadata) => {
    setSelectedProvider(prov);
    const sanitized = prov.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    setRemoteName(`${sanitized}_${Date.now().toString().slice(-4)}`);
    setAccountLabel(`${prov.name}`);
    if (prov.id === 'local') {
      tauriApi
        .getDefaultLocalPath()
        .then((defaultPath) => {
          setLocalPath(defaultPath);
        })
        .catch(() => {
          setLocalPath('C:\\');
        });
    }
    setStep(2);
  };

  const handlePickFolder = async () => {
    const selected = await tauriApi.pickFolder(localPath || undefined);
    if (selected) {
      setLocalPath(selected);
      if (
        !accountLabel ||
        accountLabel === 'Local Computer Storage' ||
        accountLabel === 'Local Computer'
      ) {
        const folderName = selected.split(/[\/\\]/).filter(Boolean).pop();
        if (folderName) {
          setAccountLabel(`Local (${folderName})`);
        }
      }
    }
  };

  const cancelRef = React.useRef(false);

  const handleCancelConnect = async () => {
    cancelRef.current = true;
    setIsConnecting(false);
    setStatusText(null);
    setErrorMsg('Connection was cancelled.');
    try {
      await tauriApi.cancelOAuth();
    } catch {
      // ignore
    }
  };

  const handleClose = () => {
    if (isConnecting) {
      handleCancelConnect();
    }
    onClose();
  };

  const validateForm = (): string | null => {
    if (!selectedProvider) return 'No provider selected.';
    const pid = selectedProvider.id;

    // 1. Local Storage
    if (pid === 'local') {
      if (!localPath.trim()) {
        return 'Please enter or select a valid local folder or drive path.';
      }
    }

    // 2. Protocols: SFTP, FTP, WebDAV, SMB, HTTP, HDFS
    if (PROTOCOLS_IDS.includes(pid)) {
      if (!endpoint.trim()) {
        if (pid === 'webdav' || pid === 'http') {
          return 'Server URL is required (e.g. https://cloud.example.com/remote.php/webdav/).';
        }
        return `Server Host / IP is required to connect to ${selectedProvider.name} (e.g. host.example.com or 192.168.1.100).`;
      }
    }

    // 3. Object Storage: S3, R2, B2, MinIO, Wasabi, DigitalOcean Spaces, Azure, etc.
    if (OBJECT_IDS.includes(pid)) {
      if (
        ['r2', 'minio', 'alibabacloud', 'swift', 'oracleobjectstorage', 'qingstor', 'netstorage'].includes(pid) &&
        !endpoint.trim()
      ) {
        return `Endpoint URL is required for ${selectedProvider.name}.`;
      }
      if (['b2', 'azureblob', 'azurefiles'].includes(pid)) {
        if (!accessKey.trim()) {
          return pid === 'azureblob' ? 'Account Name is required.' : 'Account ID / Key ID is required.';
        }
        if (!secretKey.trim()) {
          return pid === 'azureblob' ? 'Account Key is required.' : 'Application Key is required.';
        }
      } else {
        if (!accessKey.trim()) {
          return 'Access Key ID is required.';
        }
        if (!secretKey.trim()) {
          return 'Secret Access Key is required.';
        }
      }
    }

    // 4. Media & Asset Hosting (Cloudinary, ImageKit)
    if (pid === 'cloudinary') {
      if (!accessKey.trim()) return 'Cloud Name is required.';
      if (!secretKey.trim()) return 'API Key is required.';
      if (!additionalParam1.trim()) return 'API Secret is required.';
    } else if (pid === 'imagekit') {
      if (!endpoint.trim()) return 'URL Endpoint is required.';
      if (!accessKey.trim()) return 'Public Key is required.';
      if (!secretKey.trim()) return 'Private Key is required.';
    }

    // 5. Direct Media Hosters (1Fichier, Pixeldrain, Put.io, Premiumize.me, GoFile, Internet Archive)
    if (
      MEDIA_IDS.includes(pid) &&
      !['cloudinary', 'imagekit'].includes(pid) &&
      !selectedProvider.capabilities.supports_oauth
    ) {
      if (pid === 'internetarchive') {
        if (!accessKey.trim()) return 'IAS3 Access Key ID is required for Internet Archive.';
        if (!secretKey.trim()) return 'IAS3 Secret Access Key is required for Internet Archive.';
      } else if (!accessKey.trim()) {
        return `${pid === 'gofile' ? 'Account API Token' : 'API Key or Token'} is required to connect to ${selectedProvider.name}.`;
      }
    }

    // 6. Direct Credential Drives (MEGA, Proton, iCloud, Mailru, PikPak, Koofr, Filen, Internxt, Seafile, Files.com, etc.)
    if (
      !selectedProvider.capabilities.supports_oauth &&
      !OBJECT_IDS.includes(pid) &&
      !PROTOCOLS_IDS.includes(pid) &&
      !MEDIA_IDS.includes(pid) &&
      pid !== 'local'
    ) {
      if (pid === 'seafile' && !endpoint.trim()) {
        return 'Seafile Server URL is required (e.g. https://seafile.example.com).';
      }
      if (pid === 'filescom' && !endpoint.trim()) {
        return 'Files.com Site Subdomain is required (e.g. mysite).';
      }
      if (!accessKey.trim()) {
        return `${
          pid === 'iclouddrive'
            ? 'Apple ID Email'
            : pid === 'protondrive'
            ? 'Proton Username / Email'
            : pid === 'pikpak'
            ? 'Email or Phone'
            : pid === 'internxt'
            ? 'Account Email'
            : 'Username or Email'
        } is required.`;
      }
      if (pid !== 'filen' && !secretKey.trim()) {
        return `${pid === 'koofr' ? 'App Password' : 'Password'} is required.`;
      }
    }

    return null;
  };

  const handleProtocolHostChange = (val: string) => {
    let cleanVal = val.trim();

    // Check if the user pasted a complete URL (e.g. ftp://pc:0000@192.168.29.26:1628 or ftp://192.168.29.26:1628)
    const urlMatch = cleanVal.match(
      /^(?:[a-zA-Z0-9+-.]+:\/\/)?(?:([^:@\s]+)(?::([^@\s]*))?@)?([a-zA-Z0-9.-]+|\[[a-fA-F0-9:]+\])(?::(\d+))?(\/.*)?$/
    );

    if (
      cleanVal.includes('://') ||
      (cleanVal.includes(':') && !cleanVal.startsWith('['))
    ) {
      if (urlMatch) {
        const [, matchedUser, matchedPass, matchedHost, matchedPort] = urlMatch;
        if (matchedHost) {
          setEndpoint(matchedHost);
          if (matchedPort && !additionalParam1) {
            setAdditionalParam1(matchedPort);
          }
          if (matchedUser && !accessKey) {
            setAccessKey(matchedUser);
          }
          if (matchedPass && !secretKey) {
            setSecretKey(matchedPass);
          }
          return;
        }
      }
    }

    setEndpoint(val);
  };

  const handleConnect = async () => {
    if (!selectedProvider) return;
    setErrorMsg(null);

    // Validate form before proceeding
    const validationError = validateForm();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    cancelRef.current = false;
    setIsConnecting(true);
    setStatusText('Preparing connection...');

    try {
      const params: [string, string][] = [];
      const pid = selectedProvider.id;

      // 1. Local Storage
      if (pid === 'local') {
        setStatusText('Adding local computer storage...');
        const pathVal = localPath.trim() || 'home';
        await addAccount({
          provider: 'local',
          name: pathVal,
          label: accountLabel.trim() || `Local (${pathVal})`,
          parameters: [['path', pathVal]],
        });
      }
      // 2. OAuth-capable Cloud Drives
      else if (isOAuthProvider(selectedProvider)) {
        let tokenToUse = manualToken.trim();

        if (!tokenToUse) {
          setStatusText(`Opening browser for 1-click ${selectedProvider.name} authentication...`);
          try {
            const extraArgs: string[] = [];
            if (pid === 'zohoworkdrive') {
              extraArgs.push(`--zoho-region=${zohoRegion || 'com'}`);
            }
            tokenToUse = await tauriApi.authorizeOAuthCloud(
              pid,
              extraArgs.length > 0 ? extraArgs : undefined
            );
          } catch (authErr: any) {
            throw new Error(
              authErr?.message || authErr || 'Authentication cancelled or browser login failed.'
            );
          }
        }

        if (tokenToUse) {
          params.push(['token', tokenToUse]);
          params.push(['config_is_local', 'false']);
        }

        // For Zoho WorkDrive, set region parameter
        if (pid === 'zohoworkdrive') {
          params.push(['region', zohoRegion || 'com']);
        }

        // For Microsoft OneDrive, query Microsoft Graph API for drive_id and drive_type
        if (pid === 'onedrive' && tokenToUse) {
          setStatusText('Resolving OneDrive storage drive...');
          try {
            const tokenObj = JSON.parse(tokenToUse);
            if (tokenObj?.access_token) {
              const res = await fetch('https://graph.microsoft.com/v1.0/me/drive', {
                headers: {
                  Authorization: `Bearer ${tokenObj.access_token}`,
                },
              });
              if (res.ok) {
                const driveInfo = await res.json();
                if (driveInfo?.id) {
                  params.push(['drive_id', driveInfo.id]);
                }
                if (driveInfo?.driveType) {
                  params.push(['drive_type', driveInfo.driveType]);
                }
              }
            }
          } catch (e) {
            console.warn('Frontend could not fetch OneDrive details:', e);
          }
          if (!params.some(([k]) => k === 'drive_type')) {
            params.push(['drive_type', 'personal']);
          }
        }

        setStatusText('Saving connected cloud account...');
        await addAccount({
          provider: pid,
          name: remoteName.trim() || `${pid}_${Date.now().toString().slice(-4)}`,
          label: accountLabel.trim() || selectedProvider.name,
          parameters: params.length > 0 ? params : undefined,
        });
      }
      // 3. S3-Compatible & Object Storage
      else if (OBJECT_IDS.includes(pid)) {
        setStatusText(`Configuring ${selectedProvider.name} object storage...`);
        if (endpoint.trim()) params.push(['endpoint', endpoint.trim()]);
        if (accessKey.trim()) params.push(['access_key_id', accessKey.trim()]);
        if (secretKey.trim()) params.push(['secret_access_key', secretKey.trim()]);
        if (additionalParam1.trim()) params.push(['region', additionalParam1.trim()]);

        if (pid === 'alibabacloud') params.push(['provider', 'Alibaba']);
        else if (pid === 'r2') params.push(['provider', 'Cloudflare']);
        else if (pid === 'digitaloceanspaces') params.push(['provider', 'DigitalOcean']);
        else if (pid === 'wasabi') params.push(['provider', 'Wasabi']);
        else if (pid === 'minio') params.push(['provider', 'Minio']);
        else if (pid === 'filebase') params.push(['provider', 'Filebase']);
        else if (pid === 'googlecloudstorage') {
          params.push(['provider', 'Google']);
          if (!endpoint.trim()) params.push(['endpoint', 'https://storage.googleapis.com']);
        }
        else if (pid === 'b2' || pid === 'azureblob' || pid === 'azurefiles') {
          if (accessKey.trim()) params.push(['account', accessKey.trim()]);
          if (secretKey.trim()) params.push(['key', secretKey.trim()]);
        }
        else if (pid === 's3' && !params.some(([k]) => k === 'provider')) {
          params.push(['provider', 'AWS']);
        }

        await addAccount({
          provider: pid,
          name: remoteName.trim() || `${pid}_${Date.now().toString().slice(-4)}`,
          label: accountLabel.trim() || selectedProvider.name,
          parameters: params,
        });
      }
      // 4. Network Protocols & File Servers (SFTP, FTP, WebDAV, SMB, HTTP, HDFS)
      else if (PROTOCOLS_IDS.includes(pid)) {
        setStatusText(`Connecting to ${selectedProvider.name} server...`);
        let sanitizedHost = endpoint.trim();
        let portToUse = additionalParam1.trim();
        let userToUse = accessKey.trim();
        let passToUse = secretKey.trim();

        // Strip scheme prefix (e.g. ftp://, ftps://, sftp://, smb://)
        sanitizedHost = sanitizedHost.replace(/^[a-zA-Z0-9+-.]+:\/\//, '');

        if (pid === 'webdav' || pid === 'http') {
          const rawUrl = endpoint.trim();
          if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
            params.push(['url', `http://${rawUrl}`]);
          } else {
            params.push(['url', rawUrl]);
          }
        } else {
          // FTP, SFTP, SMB, HDFS
          // Remove any embedded credentials if user entered user:pass@host
          if (sanitizedHost.includes('@')) {
            const atParts = sanitizedHost.split('@');
            sanitizedHost = atParts[1] || sanitizedHost;
            if (!userToUse && atParts[0]) {
              const credParts = atParts[0].split(':');
              if (credParts[0]) userToUse = credParts[0];
              if (credParts[1] && !passToUse) passToUse = credParts[1];
            }
          }

          // Remove trailing path segment
          const slashIdx = sanitizedHost.indexOf('/');
          if (slashIdx !== -1) {
            sanitizedHost = sanitizedHost.substring(0, slashIdx);
          }

          // Extract port if embedded in host (e.g. 192.168.29.26:1628)
          if (sanitizedHost.includes(':') && !sanitizedHost.endsWith(']')) {
            const colonIdx = sanitizedHost.lastIndexOf(':');
            if (!portToUse) {
              portToUse = sanitizedHost.substring(colonIdx + 1);
            }
            sanitizedHost = sanitizedHost.substring(0, colonIdx);
          }

          if (sanitizedHost) params.push(['host', sanitizedHost]);
          if (portToUse) params.push(['port', portToUse]);
        }

        if (userToUse) params.push(['user', userToUse]);
        if (passToUse) params.push(['pass', passToUse]);
        if (pid === 'webdav') params.push(['vendor', 'nextcloud']);

        await addAccount({
          provider: pid,
          name: remoteName.trim() || `${pid}_${Date.now().toString().slice(-4)}`,
          label: accountLabel.trim() || selectedProvider.name,
          parameters: params,
        });
      }
      // 5. Media & Asset Hosting (Cloudinary, ImageKit, etc.)
      else if (pid === 'cloudinary') {
        setStatusText('Configuring Cloudinary storage...');
        if (accessKey.trim()) params.push(['cloud_name', accessKey.trim()]);
        if (secretKey.trim()) params.push(['api_key', secretKey.trim()]);
        if (additionalParam1.trim()) params.push(['api_secret', additionalParam1.trim()]);
        if (additionalParam2.trim()) params.push(['upload_preset', additionalParam2.trim()]);

        await addAccount({
          provider: 'cloudinary',
          name: remoteName.trim() || `cloudinary_${Date.now().toString().slice(-4)}`,
          label: accountLabel.trim() || 'Cloudinary',
          parameters: params,
        });
      } else if (pid === 'imagekit') {
        setStatusText('Configuring ImageKit.io storage...');
        if (accessKey.trim()) params.push(['public_key', accessKey.trim()]);
        if (secretKey.trim()) params.push(['private_key', secretKey.trim()]);
        if (endpoint.trim()) params.push(['url_endpoint', endpoint.trim()]);

        await addAccount({
          provider: 'imagekit',
          name: remoteName.trim() || `imagekit_${Date.now().toString().slice(-4)}`,
          label: accountLabel.trim() || 'ImageKit',
          parameters: params,
        });
      }
      // 6. Direct / Direct Media Hosters (1Fichier, Pixeldrain, Put.io, Premiumize.me, GoFile, Internet Archive)
      else if (MEDIA_IDS.includes(pid)) {
        setStatusText(`Configuring ${selectedProvider.name}...`);
        if (pid === 'gofile') {
          if (accessKey.trim()) params.push(['access_token', accessKey.trim()]);
        } else if (pid === 'internetarchive') {
          if (accessKey.trim()) params.push(['access_key_id', accessKey.trim()]);
          if (secretKey.trim()) params.push(['secret_access_key', secretKey.trim()]);
        } else {
          if (accessKey.trim()) params.push(['api_key', accessKey.trim()]);
        }

        await addAccount({
          provider: pid,
          name: remoteName.trim() || `${pid}_${Date.now().toString().slice(-4)}`,
          label: accountLabel.trim() || selectedProvider.name,
          parameters: params,
        });
      }
      // 7. Direct Credential Drives (MEGA, Proton, iCloud, Mailru, PikPak, Koofr, Filen, Internxt, Seafile, Files.com, etc.)
      else {
        setStatusText(`Connecting to ${selectedProvider.name}...`);
        if (pid === 'iclouddrive') {
          if (accessKey.trim()) params.push(['apple_id', accessKey.trim()]);
          if (secretKey.trim()) params.push(['password', secretKey.trim()]);
        } else if (pid === 'protondrive') {
          if (accessKey.trim()) params.push(['username', accessKey.trim()]);
          if (secretKey.trim()) params.push(['password', secretKey.trim()]);
          if (additionalParam1.trim()) params.push(['2fa', additionalParam1.trim()]);
        } else if (pid === 'linkbox') {
          if (accessKey.trim()) params.push(['email', accessKey.trim()]);
          if (secretKey.trim()) params.push(['password', secretKey.trim()]);
        } else if (pid === 'internxt') {
          if (accessKey.trim()) params.push(['email', accessKey.trim()]);
          if (secretKey.trim()) params.push(['pass', secretKey.trim()]);
          if (additionalParam1.trim()) params.push(['2fa', additionalParam1.trim()]);
        } else if (pid === 'koofr') {
          params.push(['provider', 'koofr']);
          if (accessKey.trim()) params.push(['user', accessKey.trim()]);
          if (secretKey.trim()) params.push(['password', secretKey.trim()]);
          if (endpoint.trim()) params.push(['endpoint', endpoint.trim()]);
        } else if (pid === 'seafile') {
          if (endpoint.trim()) params.push(['url', endpoint.trim()]);
          if (accessKey.trim()) params.push(['user', accessKey.trim()]);
          if (secretKey.trim()) params.push(['pass', secretKey.trim()]);
        } else if (pid === 'filescom') {
          const siteClean = endpoint.trim().replace(/^https?:\/\//, '').replace(/\.files\.com\/?$/, '');
          if (siteClean) params.push(['site', siteClean]);
          if (accessKey.trim()) params.push(['username', accessKey.trim()]);
          if (secretKey.trim()) params.push(['password', secretKey.trim()]);
        } else if (pid === 'filen') {
          if (secretKey.trim()) {
            if (accessKey.trim()) params.push(['email', accessKey.trim()]);
            params.push(['password', secretKey.trim()]);
          } else {
            if (accessKey.trim()) params.push(['api_key', accessKey.trim()]);
          }
        } else {
          if (accessKey.trim()) params.push(['user', accessKey.trim()]);
          if (secretKey.trim()) params.push(['pass', secretKey.trim()]);
          if (additionalParam1.trim()) params.push(['2fa', additionalParam1.trim()]);
          if (endpoint.trim()) params.push(['endpoint', endpoint.trim()]);
        }

        await addAccount({
          provider: pid,
          name: remoteName.trim() || `${pid}_${Date.now().toString().slice(-4)}`,
          label: accountLabel.trim() || selectedProvider.name,
          parameters: params,
        });
      }

      if (cancelRef.current) return;

      setStep(3);
      addToast({
        type: 'success',
        title: 'Account Connected',
        message: `Successfully connected ${accountLabel || selectedProvider.name}`,
      });
    } catch (err: any) {
      if (cancelRef.current) return;
      setErrorMsg(err.message || 'Failed to authenticate and connect cloud provider');
    } finally {
      if (!cancelRef.current) {
        setIsConnecting(false);
        setStatusText(null);
      }
    }
  };

  // Filter providers by search query, category, and auth/feature tag
  const filteredProviders = providers.filter((p) => {
    // Search match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Category match
    if (categoryFilter === 'popular' && !POPULAR_IDS.includes(p.id)) return false;
    if (categoryFilter === 'drives' && !DRIVES_IDS.includes(p.id)) return false;
    if (categoryFilter === 'object' && !OBJECT_IDS.includes(p.id)) return false;
    if (categoryFilter === 'protocols' && !PROTOCOLS_IDS.includes(p.id)) return false;
    if (categoryFilter === 'media' && !MEDIA_IDS.includes(p.id)) return false;

    // Auth / Feature Tag match
    if (authFilter === 'oauth' && !isOAuthProvider(p)) return false;
    if (authFilter === 'api' && !isApiProvider(p.id)) return false;
    if (authFilter === 'credentials' && !isCredentialsProvider(p.id)) return false;
    if (authFilter === 'protocols' && !isProtocolProvider(p.id)) return false;
    if (authFilter === 'quota' && !p.capabilities.supports_quota) return false;

    return true;
  });

  // Sort providers according to chosen sort option
  const sortedProviders = [...filteredProviders].sort((a, b) => {
    if (sortBy === 'name-asc') {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === 'name-desc') {
      return b.name.localeCompare(a.name);
    }
    if (sortBy === 'oauth-first') {
      const aOAuth = a.capabilities.supports_oauth ? 1 : 0;
      const bOAuth = b.capabilities.supports_oauth ? 1 : 0;
      if (aOAuth !== bOAuth) return bOAuth - aOAuth;
      return a.name.localeCompare(b.name);
    }
    if (sortBy === 'quota-first') {
      const aQuota = a.capabilities.supports_quota ? 1 : 0;
      const bQuota = b.capabilities.supports_quota ? 1 : 0;
      if (aQuota !== bQuota) return bQuota - aQuota;
      return a.name.localeCompare(b.name);
    }
    return 0;
  });

  // Category counts
  const popularCount = providers.filter((p) => POPULAR_IDS.includes(p.id)).length;
  const drivesCount = providers.filter((p) => DRIVES_IDS.includes(p.id)).length;
  const objectCount = providers.filter((p) => OBJECT_IDS.includes(p.id)).length;
  const protocolsCount = providers.filter((p) => PROTOCOLS_IDS.includes(p.id)).length;
  const mediaCount = providers.filter((p) => MEDIA_IDS.includes(p.id)).length;

  // Auth / Feature Tag counts
  const oauthCount = providers.filter(isOAuthProvider).length;
  const apiCount = providers.filter((p) => isApiProvider(p.id)).length;
  const credsCount = providers.filter((p) => isCredentialsProvider(p.id)).length;
  const protoCount = providers.filter((p) => isProtocolProvider(p.id)).length;
  const quotaCount = providers.filter((p) => p.capabilities.supports_quota).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Connect Storage Account"
      description={
        step === 1
          ? 'Choose a cloud, bucket, server or local storage provider to connect'
          : step === 2
          ? `Set up your ${selectedProvider?.name} account`
          : 'Storage Account Connected Successfully'
      }
      maxWidth="lg"
    >
      {/* STEP 1: Provider Selection */}
      {step === 1 && (
        <div className="space-y-3.5">
          {/* Search bar & Sort Controls */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search across ${providers.length || '60+'} cloud, drive & storage backends...`}
                  className="w-full h-10 pl-10 pr-9 bg-muted/50 border border-border/80 rounded-xl text-xs placeholder:text-muted-foreground text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Sort by dropdown */}
              <div className="flex items-center gap-1.5 h-10 px-3 bg-muted/50 border border-border/80 rounded-xl text-xs text-foreground font-semibold shrink-0">
                <ArrowUpDown size={13} className="text-primary shrink-0" />
                <span className="text-muted-foreground font-normal text-[11px] hidden sm:inline">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-transparent text-xs text-foreground font-semibold focus:outline-none cursor-pointer pr-1"
                >
                  <option value="default" className="bg-popover text-popover-foreground">Recommended</option>
                  <option value="name-asc" className="bg-popover text-popover-foreground">Name (A → Z)</option>
                  <option value="name-desc" className="bg-popover text-popover-foreground">Name (Z → A)</option>
                  <option value="oauth-first" className="bg-popover text-popover-foreground">1-Click Login First</option>
                  <option value="quota-first" className="bg-popover text-popover-foreground">Quota Support First</option>
                </select>
              </div>
            </div>

            {/* Quick Category Chips */}
            <div
              ref={categoryChipsRef}
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-[11px] font-semibold text-muted-foreground select-none"
            >
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={cn(
                  'px-3 py-1 rounded-lg transition-all shrink-0',
                  categoryFilter === 'all'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/60 hover:bg-muted text-foreground'
                )}
              >
                All ({providers.length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('popular')}
                className={cn(
                  'px-3 py-1 rounded-lg transition-all shrink-0',
                  categoryFilter === 'popular'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/60 hover:bg-muted text-foreground'
                )}
              >
                Popular ({popularCount})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('drives')}
                className={cn(
                  'px-3 py-1 rounded-lg transition-all shrink-0',
                  categoryFilter === 'drives'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/60 hover:bg-muted text-foreground'
                )}
              >
                Personal & Team Drives ({drivesCount})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('object')}
                className={cn(
                  'px-3 py-1 rounded-lg transition-all shrink-0',
                  categoryFilter === 'object'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/60 hover:bg-muted text-foreground'
                )}
              >
                Object & Buckets ({objectCount})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('protocols')}
                className={cn(
                  'px-3 py-1 rounded-lg transition-all shrink-0',
                  categoryFilter === 'protocols'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/60 hover:bg-muted text-foreground'
                )}
              >
                Protocols & Servers ({protocolsCount})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('media')}
                className={cn(
                  'px-3 py-1 rounded-lg transition-all shrink-0',
                  categoryFilter === 'media'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/60 hover:bg-muted text-foreground'
                )}
              >
                Direct & Media Hosting ({mediaCount})
              </button>
            </div>

            {/* Auth Type & Feature Tag Filter Chips */}
            <div
              ref={authChipsRef}
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 pb-1 text-[10px] font-semibold select-none border-t border-border/40"
            >
              <span className="text-muted-foreground/70 shrink-0 uppercase tracking-wider text-[9px] font-bold pl-0.5 pr-1">
                Filter by:
              </span>
              <button
                type="button"
                onClick={() => setAuthFilter('all')}
                className={cn(
                  'px-2.5 py-0.5 rounded-md transition-all shrink-0',
                  authFilter === 'all'
                    ? 'bg-foreground text-background font-bold shadow-xs'
                    : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                All Types
              </button>
              <button
                type="button"
                onClick={() => setAuthFilter(authFilter === 'oauth' ? 'all' : 'oauth')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-0.5 rounded-md transition-all shrink-0',
                  authFilter === 'oauth'
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20'
                )}
              >
                <Sparkles size={11} />
                <span>1-Click Login ({oauthCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setAuthFilter(authFilter === 'api' ? 'all' : 'api')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-0.5 rounded-md transition-all shrink-0',
                  authFilter === 'api'
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                )}
              >
                <Key size={11} />
                <span>API / Keys ({apiCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setAuthFilter(authFilter === 'credentials' ? 'all' : 'credentials')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-0.5 rounded-md transition-all shrink-0',
                  authFilter === 'credentials'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                )}
              >
                <User size={11} />
                <span>Credentials ({credsCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setAuthFilter(authFilter === 'protocols' ? 'all' : 'protocols')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-0.5 rounded-md transition-all shrink-0',
                  authFilter === 'protocols'
                    ? 'bg-purple-600 text-white font-bold shadow-xs'
                    : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20'
                )}
              >
                <Server size={11} />
                <span>Server Protocols ({protoCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setAuthFilter(authFilter === 'quota' ? 'all' : 'quota')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-0.5 rounded-md transition-all shrink-0',
                  authFilter === 'quota'
                    ? 'bg-cyan-600 text-white font-bold shadow-xs'
                    : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20'
                )}
              >
                <Database size={11} />
                <span>Quota Support ({quotaCount})</span>
              </button>
            </div>
          </div>

          {/* Provider Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto p-1 scrollbar-thin">
            {sortedProviders.length === 0 ? (
              <div className="col-span-2 py-10 text-center space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  No storage providers matching your active filters
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('all');
                    setAuthFilter('all');
                    setSortBy('default');
                  }}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              sortedProviders.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelectProvider(p)}
                  className="group flex flex-col justify-between p-3.5 rounded-2xl border border-border/80 hover:border-primary/50 bg-card hover:bg-accent/40 transition-all duration-150 cursor-pointer shadow-xs hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/60 flex items-center justify-center p-2 border border-border/80 shrink-0 group-hover:scale-105 transition-transform">
                      <ProviderIcon provider={p.id} size={22} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {p.name}
                      </h4>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                        {p.description}
                      </p>
                    </div>
                  </div>

                  {/* Capabilities interactive pills */}
                  <div className="flex flex-wrap items-center gap-1 mt-2.5 pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
                    {p.id === 'local' ? (
                      <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 font-semibold">
                        Instant Access
                      </span>
                    ) : p.capabilities.supports_oauth ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAuthFilter(authFilter === 'oauth' ? 'all' : 'oauth');
                        }}
                        className={cn(
                          'px-1.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer',
                          authFilter === 'oauth'
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20'
                        )}
                        title="Click to filter by 1-Click Login"
                      >
                        1-Click Login
                      </button>
                    ) : PROTOCOLS_IDS.includes(p.id) ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAuthFilter(authFilter === 'protocols' ? 'all' : 'protocols');
                        }}
                        className={cn(
                          'px-1.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer',
                          authFilter === 'protocols'
                            ? 'bg-purple-600 text-white'
                            : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20'
                        )}
                        title="Click to filter by Server Protocols"
                      >
                        Server Protocol
                      </button>
                    ) : isApiProvider(p.id) ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAuthFilter(authFilter === 'api' ? 'all' : 'api');
                        }}
                        className={cn(
                          'px-1.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer',
                          authFilter === 'api'
                            ? 'bg-amber-600 text-white'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                        )}
                        title="Click to filter by API / Keys"
                      >
                        API / Keys
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAuthFilter(authFilter === 'credentials' ? 'all' : 'credentials');
                        }}
                        className={cn(
                          'px-1.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer',
                          authFilter === 'credentials'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                        )}
                        title="Click to filter by Credentials"
                      >
                        Credentials
                      </button>
                    )}

                    {p.capabilities.supports_quota && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAuthFilter(authFilter === 'quota' ? 'all' : 'quota');
                        }}
                        className={cn(
                          'px-1.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer',
                          authFilter === 'quota'
                            ? 'bg-cyan-600 text-white'
                            : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20'
                        )}
                        title="Click to filter by Quota Support"
                      >
                        Quota
                      </button>
                    )}

                    <span className="ml-auto text-primary font-semibold text-[11px] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      <span>Connect</span>
                      <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between pt-2.5 border-t border-border/60 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Shield size={13} className="text-emerald-500" />
              Credentials protected by native OS secure credential storage
            </span>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl hover:bg-accent text-foreground transition-colors font-medium text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Configuration & Auth */}
      {step === 2 && selectedProvider && (
        <div className="space-y-4">
          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-accent/40 border border-border/80">
            <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center p-2 border border-border/80 shrink-0">
              <ProviderIcon provider={selectedProvider.id} size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">{selectedProvider.name}</p>
              <p className="text-[11px] text-muted-foreground">{selectedProvider.description}</p>
            </div>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Account Nickname <span className="text-muted-foreground font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                autoFocus
                value={accountLabel}
                onChange={(e) => setAccountLabel(e.target.value)}
                placeholder={`e.g. My ${selectedProvider.name}`}
                className="w-full h-10 px-3 bg-muted/60 border border-border/80 rounded-xl text-xs placeholder:text-muted-foreground text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>

            {/* Local Storage folder picker / path */}
            {selectedProvider.id === 'local' && (
              <div className="space-y-2.5 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-foreground">
                    Folder or Drive Path <span className="text-destructive font-bold">*</span>
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    Choose any folder or disk drive
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={localPath}
                    onChange={(e) => setLocalPath(e.target.value)}
                    placeholder="e.g. C:\Users\YourName\Documents"
                    className="flex-1 h-10 px-3 bg-muted/60 border border-border/80 rounded-xl text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={handlePickFolder}
                    className="flex items-center gap-1.5 h-10 px-3.5 bg-secondary hover:bg-secondary/80 text-foreground border border-border/80 rounded-xl text-xs font-semibold shadow-xs transition-all shrink-0 hover:border-primary/50 hover:text-primary cursor-pointer active:scale-95"
                    title="Browse folders on your computer"
                  >
                    <FolderOpen size={15} className="text-primary" />
                    <span>Browse...</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-muted-foreground">Quick presets:</span>
                  {['Documents', 'Downloads', 'Pictures', 'Desktop', 'C:\\'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setLocalPath(preset)}
                      className="px-2 py-0.5 rounded-md bg-accent text-[10px] text-foreground hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* S3 & Object Storage (S3, B2, R2, GCS, Azure, Spaces, Wasabi, MinIO, Alibaba, OCI, Swift, etc.) */}
            {OBJECT_IDS.includes(selectedProvider.id) && (
              <div className="space-y-3 pt-2 border-t border-border/60">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    {['r2', 'minio', 'alibabacloud', 'swift', 'oracleobjectstorage', 'qingstor', 'netstorage'].includes(selectedProvider.id) ? (
                      <>
                        {selectedProvider.id === 'r2'
                          ? 'R2 Endpoint URL'
                          : selectedProvider.id === 'alibabacloud'
                          ? 'OSS Endpoint'
                          : selectedProvider.id === 'minio'
                          ? 'MinIO Server Endpoint'
                          : 'Endpoint URL'}{' '}
                        <span className="text-destructive font-bold">*</span>
                      </>
                    ) : (
                      <>
                        {selectedProvider.id === 'digitaloceanspaces'
                          ? 'Spaces Region / Endpoint'
                          : selectedProvider.id === 'b2'
                          ? 'Backblaze S3 Endpoint'
                          : 'Endpoint URL'}{' '}
                        <span className="text-muted-foreground font-normal">(Optional for standard S3)</span>
                      </>
                    )}
                  </label>
                  <input
                    type="text"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder={
                      selectedProvider.id === 'r2'
                        ? 'e.g. https://<accountid>.r2.cloudflarestorage.com'
                        : selectedProvider.id === 'b2'
                        ? 'e.g. s3.us-west-004.backblazeb2.com'
                        : selectedProvider.id === 'digitaloceanspaces'
                        ? 'e.g. nyc3.digitaloceanspaces.com'
                        : selectedProvider.id === 'wasabi'
                        ? 'e.g. s3.wasabisys.com'
                        : selectedProvider.id === 'minio'
                        ? 'e.g. http://localhost:9000 or https://play.min.io'
                        : selectedProvider.id === 'alibabacloud'
                        ? 'e.g. oss-cn-hangzhou.aliyuncs.com'
                        : 'Leave blank for AWS S3 default, or custom endpoint'
                    }
                    className="w-full h-9 px-3 bg-muted/60 border border-border/80 rounded-xl text-xs placeholder:text-muted-foreground text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">
                      {selectedProvider.id === 'b2'
                        ? 'Key ID / Account ID'
                        : selectedProvider.id === 'azureblob'
                        ? 'Account Name'
                        : 'Access Key ID'}{' '}
                      <span className="text-destructive font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      value={accessKey}
                      onChange={(e) => setAccessKey(e.target.value)}
                      placeholder="Access Key / Account ID"
                      className="w-full h-9 px-3 bg-muted/60 border border-border/80 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">
                      {selectedProvider.id === 'b2'
                        ? 'Application Key'
                        : selectedProvider.id === 'azureblob'
                        ? 'Account Key / SAS'
                        : 'Secret Access Key'}{' '}
                      <span className="text-destructive font-bold">*</span>
                    </label>
                    <input
                      type="password"
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      placeholder="Secret Key / App Key"
                      className="w-full h-9 px-3 bg-muted/60 border border-border/80 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Region / Zone <span className="text-muted-foreground font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={additionalParam1}
                    onChange={(e) => setAdditionalParam1(e.target.value)}
                    placeholder="e.g. us-east-1, auto, or leave blank"
                    className="w-full h-9 px-3 bg-muted/60 border border-border/80 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                </div>
              </div>
            )}

            {/* Network Protocols (SFTP, FTP, WebDAV, SMB, HTTP, HDFS) */}
            {PROTOCOLS_IDS.includes(selectedProvider.id) && (
              <div className="space-y-3 pt-2 border-t border-border/60">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="flex items-center text-xs font-bold text-foreground mb-1 h-5">
                      {selectedProvider.id === 'webdav' || selectedProvider.id === 'http'
                        ? 'Server URL'
                        : 'Server Host / IP'}{' '}
                      <span className="text-destructive font-bold ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      value={endpoint}
                      onChange={(e) => handleProtocolHostChange(e.target.value)}
                      placeholder={
                        selectedProvider.id === 'webdav'
                          ? 'https://cloud.example.com/remote.php/webdav/'
                          : selectedProvider.id === 'sftp'
                          ? 'sftp.example.com or 192.168.1.100'
                          : selectedProvider.id === 'smb'
                          ? 'nas.local or 192.168.1.100'
                          : '192.168.1.100 or ftp.example.com'
                      }
                      className="w-full h-9 px-3 bg-muted/60 border border-border/80 rounded-xl text-xs font-mono placeholder:text-muted-foreground text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="flex items-center text-xs font-bold text-foreground mb-1 h-5">
                      Port <span className="text-muted-foreground font-normal ml-1.5">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={additionalParam1}
                      onChange={(e) => setAdditionalParam1(e.target.value)}
                      placeholder={
                        selectedProvider.id === 'sftp'
                          ? '22'
                          : selectedProvider.id === 'ftp'
                          ? '21'
                          : selectedProvider.id === 'smb'
                          ? '445'
                          : 'default'
                      }
                      className="w-full h-9 px-3 bg-muted/60 border border-border/80 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="flex items-center text-xs font-bold text-foreground mb-1 h-5">
                        Username <span className="text-muted-foreground font-normal ml-1.5">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={accessKey}
                        onChange={(e) => setAccessKey(e.target.value)}
                        placeholder="Username"
                        className="w-full h-9 px-3 bg-muted/60 border border-border/80 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="flex items-center text-xs font-bold text-foreground mb-1 h-5">
                        Password <span className="text-muted-foreground font-normal ml-1.5">(Optional)</span>
                      </label>
                      <input
                        type="password"
                        value={secretKey}
                        onChange={(e) => setSecretKey(e.target.value)}
                        placeholder="Password"
                        className="w-full h-9 px-3 bg-muted/60 border border-border/80 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                      />
                    </div>
                  </div>
                  {selectedProvider.id === 'ftp' && (
                    <p className="text-[11px] text-muted-foreground pt-0.5">
                      Leave username and password blank if your FTP server allows anonymous login.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Cloudinary & ImageKit Media Hosters */}
            {(selectedProvider.id === 'cloudinary' || selectedProvider.id === 'imagekit') && (
              <div className="space-y-3 pt-2 border-t border-border/60">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    {selectedProvider.id === 'cloudinary' ? 'Cloud Name' : 'URL Endpoint'}{' '}
                    <span className="text-destructive font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={selectedProvider.id === 'cloudinary' ? accessKey : endpoint}
                    onChange={(e) =>
                      selectedProvider.id === 'cloudinary'
                        ? setAccessKey(e.target.value)
                        : setEndpoint(e.target.value)
                    }
                    placeholder={
                      selectedProvider.id === 'cloudinary'
                        ? 'Your Cloudinary cloud name'
                        : 'https://ik.imagekit.io/your_id'
                    }
                    className="w-full h-9 px-3 bg-muted/60 border border-border/80 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">
                      {selectedProvider.id === 'cloudinary' ? 'API Key' : 'Public Key'}{' '}
                      <span className="text-destructive font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      value={selectedProvider.id === 'cloudinary' ? secretKey : accessKey}
                      onChange={(e) =>
                        selectedProvider.id === 'cloudinary'
                          ? setSecretKey(e.target.value)
                          : setAccessKey(e.target.value)
                      }
                      placeholder="Public / API Key"
                      className="w-full h-9 px-3 bg-muted/60 border border-border/80 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">
                      {selectedProvider.id === 'cloudinary' ? 'API Secret' : 'Private Key'}{' '}
                      <span className="text-destructive font-bold">*</span>
                    </label>
                    <input
                      type="password"
                      value={selectedProvider.id === 'cloudinary' ? additionalParam1 : secretKey}
                      onChange={(e) =>
                        selectedProvider.id === 'cloudinary'
                          ? setAdditionalParam1(e.target.value)
                          : setSecretKey(e.target.value)
                      }
                      placeholder="API Secret / Private Key"
                      className="w-full h-9 px-3 bg-muted/60 border border-border/80 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Direct Media Hosters (1Fichier, Pixeldrain, Put.io, Premiumize.me, GoFile, Internet Archive) */}
            {MEDIA_IDS.includes(selectedProvider.id) &&
              !['cloudinary', 'imagekit'].includes(selectedProvider.id) &&
              !selectedProvider.capabilities.supports_oauth && (
                <div className="space-y-3 pt-2 border-t border-border/60">
                  {selectedProvider.id === 'internetarchive' ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-muted/40 border border-border/80 text-[11px] text-muted-foreground leading-relaxed">
                        <p className="font-semibold text-foreground mb-0.5">
                          IAS3 Credentials Required
                        </p>
                        Get your IAS3 keys at{' '}
                        <span className="text-primary font-mono font-medium">archive.org/account/s3.php</span>.
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="flex items-center text-xs font-bold text-foreground mb-1 h-5">
                            IAS3 Access Key <span className="text-destructive font-bold ml-1">*</span>
                          </label>
                          <input
                            type="text"
                            value={accessKey}
                            onChange={(e) => setAccessKey(e.target.value)}
                            placeholder="IAS3 Access Key ID"
                            className="w-full h-9 px-3 bg-muted/60 border border-border/80 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="flex items-center text-xs font-bold text-foreground mb-1 h-5">
                            IAS3 Secret Key <span className="text-destructive font-bold ml-1">*</span>
                          </label>
                          <input
                            type="password"
                            value={secretKey}
                            onChange={(e) => setSecretKey(e.target.value)}
                            placeholder="IAS3 Secret Key"
                            className="w-full h-9 px-3 bg-muted/60 border border-border/80 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1">
                        {selectedProvider.id === 'gofile'
                          ? 'Account API Token'
                          : selectedProvider.id === 'fichier'
                          ? '1Fichier API Key'
                          : 'API Key / Token'}{' '}
                        <span className="text-destructive font-bold">*</span>
                      </label>
                      <input
                        type="password"
                        value={accessKey}
                        onChange={(e) => setAccessKey(e.target.value)}
                        placeholder={
                          selectedProvider.id === 'gofile'
                            ? 'Your Gofile Profile API Token'
                            : 'API Key or Token'
                        }
                        className="w-full h-9 px-3 bg-muted/60 border border-border/80 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                      />
                    </div>
                  )}
                </div>
              )}

            {/* Direct Credential Drives (MEGA, Proton, iCloud, Mailru, PikPak, Koofr, Filen, Internxt, Seafile, Files.com, etc.) */}
            {!selectedProvider.capabilities.supports_oauth &&
              !OBJECT_IDS.includes(selectedProvider.id) &&
              !PROTOCOLS_IDS.includes(selectedProvider.id) &&
              !MEDIA_IDS.includes(selectedProvider.id) &&
              selectedProvider.id !== 'local' && (
                <div className="space-y-3 pt-2 border-t border-border/60">
                  {selectedProvider.id === 'iclouddrive' && (
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-muted-foreground leading-relaxed">
                      <p className="font-semibold text-foreground mb-0.5">
                        App-Specific Password Required
                      </p>
                      Generate an App-Specific Password at{' '}
                      <span className="text-primary font-mono font-medium">appleid.apple.com</span>{' '}
                      under Security &gt; App-Specific Passwords.
                    </div>
                  )}

                  {['koofr', 'seafile', 'filescom'].includes(selectedProvider.id) && (
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1">
                        {selectedProvider.id === 'filescom'
                          ? 'Files.com Site Subdomain / Host'
                          : selectedProvider.id === 'seafile'
                          ? 'Seafile Server URL'
                          : 'Server / Domain URL'}{' '}
                        <span
                          className={
                            selectedProvider.id === 'seafile' || selectedProvider.id === 'filescom'
                              ? 'text-destructive font-bold'
                              : 'text-muted-foreground font-normal'
                          }
                        >
                          {selectedProvider.id === 'seafile' || selectedProvider.id === 'filescom'
                            ? '*'
                            : '(Optional)'}
                        </span>
                      </label>
                      <input
                        type="text"
                        value={endpoint}
                        onChange={(e) => setEndpoint(e.target.value)}
                        placeholder={
                          selectedProvider.id === 'filescom'
                            ? 'e.g. mysite or mysite.files.com'
                            : selectedProvider.id === 'seafile'
                            ? 'https://seafile.example.com'
                            : 'Leave blank for default server, or custom domain'
                        }
                        className="w-full h-9 px-3 bg-muted/60 border border-border/80 rounded-xl text-xs placeholder:text-muted-foreground text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                      />
                    </div>
                  )}

                  {selectedProvider.id === 'koofr' && (
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/80 text-[11px] text-muted-foreground">
                      Use an App Password generated under Koofr Preferences &gt; Password &gt; App Passwords.
                    </div>
                  )}

                  {selectedProvider.id === 'filen' && (
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/80 text-[11px] text-muted-foreground">
                      Enter your Filen account email &amp; password, or your Filen API key.
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">
                      {selectedProvider.id === 'iclouddrive'
                        ? 'Apple ID Email'
                        : selectedProvider.id === 'protondrive'
                        ? 'Proton Username / Email'
                        : selectedProvider.id === 'pikpak'
                        ? 'Email or Phone'
                        : selectedProvider.id === 'internxt'
                        ? 'Account Email'
                        : 'Account Email / Username'}{' '}
                      <span className="text-destructive font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      value={accessKey}
                      onChange={(e) => setAccessKey(e.target.value)}
                      placeholder={selectedProvider.id === 'internxt' ? 'your@email.com' : 'username or email@domain.com'}
                      className="w-full h-9 px-3 bg-muted/60 border border-border/80 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">
                      {selectedProvider.id === 'iclouddrive'
                        ? 'App-Specific Password'
                        : selectedProvider.id === 'mailru'
                        ? 'App Password'
                        : 'Account Password'}{' '}
                      <span className="text-destructive font-bold">*</span>
                    </label>
                    <input
                      type="password"
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      placeholder="Password"
                      className="w-full h-9 px-3 bg-muted/60 border border-border/80 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                  </div>

                  {['mega', 'protondrive', 'internxt'].includes(selectedProvider.id) && (
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1">
                        2FA Security Code <span className="text-muted-foreground font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={additionalParam1}
                        onChange={(e) => setAdditionalParam1(e.target.value)}
                        placeholder="6-digit authenticator code (if 2FA is active)"
                        className="w-full h-9 px-3 bg-muted/60 border border-border/80 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                      />
                    </div>
                  )}
                </div>
              )}

            {/* OAuth prompt for Google Drive, OneDrive, Dropbox, Box, Google Photos, Huawei Drive, pCloud, Zoho */}
            {isOAuthProvider(selectedProvider) && (
              <div className="space-y-3 pt-2 border-t border-border/60">
                {/* Zoho WorkDrive Region Selection */}
                {selectedProvider.id === 'zohoworkdrive' && (
                  <div className="space-y-1.5 p-3 rounded-2xl bg-muted/40 border border-border/80">
                    <label className="block text-xs font-bold text-foreground">
                      Zoho Account Region / Domain
                    </label>
                    <select
                      value={zohoRegion}
                      onChange={(e) => setZohoRegion(e.target.value)}
                      className="w-full h-9 px-3 bg-card border border-border/80 rounded-xl text-xs text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary cursor-pointer"
                    >
                      <option value="in">India (zoho.in)</option>
                      <option value="com">Global / United States (zoho.com)</option>
                      <option value="eu">Europe (zoho.eu)</option>
                      <option value="com.au">Australia (zoho.com.au)</option>
                      <option value="jp">Japan (zoho.jp)</option>
                      <option value="com.cn">China (zoho.com.cn)</option>
                    </select>
                    <p className="text-[11px] text-muted-foreground">
                      Select the regional domain where your Zoho account was created (e.g. check if you sign in to zoho.in or zoho.com).
                    </p>
                  </div>
                )}

                <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground space-y-1.5">
                  <p className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                    <Sparkles size={14} className="text-primary" />
                    1-Click Browser Authentication
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    Clicking "Connect {selectedProvider.name}" will securely open your default web browser to authorize Any Cloud. Your tokens are securely handled and never exposed.
                  </p>
                </div>

                {/* Optional manual token toggle */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showAdvanced ? '− Hide Manual Token Entry' : '+ Manual OAuth Token / Advanced'}</span>
                  </button>

                  {showAdvanced && (
                    <div className="mt-2 p-3 rounded-xl bg-muted/40 border border-border/70 space-y-2">
                      <label className="block text-[11px] font-semibold text-foreground">
                        OAuth Token JSON (Optional)
                      </label>
                      <textarea
                        value={manualToken}
                        onChange={(e) => setManualToken(e.target.value)}
                        placeholder='{"access_token":"...","refresh_token":"..."}'
                        rows={3}
                        className="w-full p-2 bg-background border border-border rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {statusText && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                <span className="truncate">{statusText}</span>
              </div>
              <button
                type="button"
                onClick={handleCancelConnect}
                className="text-xs font-semibold text-destructive hover:underline ml-3 shrink-0 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={() => {
                if (isConnecting) handleCancelConnect();
                setStep(1);
              }}
              className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-accent transition-colors cursor-pointer"
            >
              Back
            </button>
            {isConnecting ? (
              <button
                type="button"
                onClick={handleCancelConnect}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                title="Cancel connecting"
              >
                <X size={15} />
                <span>Cancel</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnect}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <span>Connect {selectedProvider.name}</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: Success Confirmation */}
      {step === 3 && (
        <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-xs">
            <CheckCircle2 size={36} />
          </div>
          <div>
            <h4 className="text-base font-bold text-foreground">
              {accountLabel || selectedProvider?.name} Connected!
            </h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Your storage account is now linked to Any Cloud. Files and folders are ready to browse, organize, and transfer.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => {
                onClose();
                setActivePage('files');
              }}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-xs"
            >
              Browse Files Now
            </button>
            <button
              onClick={() => {
                setStep(1);
                setSelectedProvider(null);
                setAccountLabel('');
                setRemoteName('');
                setLocalPath('');
              }}
              className="px-4 py-2 rounded-xl bg-card border border-border/80 text-foreground text-xs font-semibold hover:bg-accent transition-all cursor-pointer"
            >
              + Add Another Storage
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
