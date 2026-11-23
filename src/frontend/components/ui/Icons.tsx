import React from 'react';
import appIcon from '../../assets/app_icon.png';
import gdriveIcon from '../../assets/gdrive_icon.png';
import onedriveIcon from '../../assets/onedrive_icon.png';

// User-provided official brand PNG assets
import netstoragePng from '../../assets/providers/netstorage.png';
import b2Png from '../../assets/providers/b2.png';
import sharefilePng from '../../assets/providers/sharefile.png';
import r2Png from '../../assets/providers/r2.png';
import digitaloceanspacesPng from '../../assets/providers/digitaloceanspaces.png';
import drimePng from '../../assets/providers/drime.png';
import fileluPng from '../../assets/providers/filelu.png';
import filescomPng from '../../assets/providers/filescom.png';
import filebasePng from '../../assets/providers/filebase.png';
import gofilePng from '../../assets/providers/gofile.png';
import googlecloudstoragePng from '../../assets/providers/googlecloudstorage.png';
import hidrivePng from '../../assets/providers/hidrive.png';
import imagekitPng from '../../assets/providers/imagekit.png';
import kdrivePng from '../../assets/providers/kdrive.png';
import internxtPng from '../../assets/providers/internxt.png';
import jottacloudPng from '../../assets/providers/jottacloud.png';
import koofrPng from '../../assets/providers/koofr.png';
import linkboxPng from '../../assets/providers/linkbox.png';
import azureblobPng from '../../assets/providers/azureblob.png';
import azurefilesPng from '../../assets/providers/azurefiles.png';
import minioPng from '../../assets/providers/minio.png';
import opendrivePng from '../../assets/providers/opendrive.png';
import swiftPng from '../../assets/providers/swift.png';
import pcloudPng from '../../assets/providers/pcloud.png';
import pixeldrainPng from '../../assets/providers/pixeldrain.png';
import premiumizemePng from '../../assets/providers/premiumizeme.png';
import protondrivePng from '../../assets/providers/protondrive.png';
import putioPng from '../../assets/providers/putio.png';
import qingstorPng from '../../assets/providers/qingstor.png';
import seafilePng from '../../assets/providers/seafile.png';
import siaPng from '../../assets/providers/sia.png';
import storjPng from '../../assets/providers/storj.png';
import sugarsyncPng from '../../assets/providers/sugarsync.png';
import wasabiPng from '../../assets/providers/wasabi.png';
import yandexPng from '../../assets/providers/yandex.png';

import {
  Archive,
  Cloud,
  Code,
  Database,
  File,
  FileCode,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  HardDrive,
  Image as ImageIcon,
  Music,
  Server,
  Video,
} from 'lucide-react';

interface IconProps {
  className?: string;
  size?: number;
}

const PROVIDER_PNGS: Record<string, string> = {
  gdrive: gdriveIcon,
  drive: gdriveIcon,
  'google drive': gdriveIcon,
  googledrive: gdriveIcon,
  'google-drive': gdriveIcon,
  onedrive: onedriveIcon,
  'one drive': onedriveIcon,
  netstorage: netstoragePng,
  akamai: netstoragePng,
  b2: b2Png,
  backblaze: b2Png,
  'backblaze b2': b2Png,
  sharefile: sharefilePng,
  citrix: sharefilePng,
  'citrix sharefile': sharefilePng,
  r2: r2Png,
  'cloudflare r2': r2Png,
  digitaloceanspaces: digitaloceanspacesPng,
  spaces: digitaloceanspacesPng,
  drime: drimePng,
  filelu: fileluPng,
  filescom: filescomPng,
  'files.com': filescomPng,
  filebase: filebasePng,
  gofile: gofilePng,
  googlecloudstorage: googlecloudstoragePng,
  gcs: googlecloudstoragePng,
  hidrive: hidrivePng,
  imagekit: imagekitPng,
  kdrive: kdrivePng,
  infomaniak: kdrivePng,
  internxt: internxtPng,
  jottacloud: jottacloudPng,
  koofr: koofrPng,
  linkbox: linkboxPng,
  azureblob: azureblobPng,
  azure: azureblobPng,
  azurefiles: azurefilesPng,
  minio: minioPng,
  opendrive: opendrivePng,
  swift: swiftPng,
  openstack: swiftPng,
  pcloud: pcloudPng,
  pixeldrain: pixeldrainPng,
  premiumizeme: premiumizemePng,
  protondrive: protondrivePng,
  proton: protondrivePng,
  putio: putioPng,
  'put.io': putioPng,
  qingstor: qingstorPng,
  seafile: seafilePng,
  sia: siaPng,
  storj: storjPng,
  sugarsync: sugarsyncPng,
  wasabi: wasabiPng,
  yandex: yandexPng,
};

export const ProviderIcon: React.FC<{ provider: string; className?: string; size?: number }> = ({
  provider,
  className = 'w-5 h-5',
  size = 20,
}) => {
  const key = provider.toLowerCase().trim();

  // 1. Check if an official PNG asset exists
  const pngSrc = PROVIDER_PNGS[key];
  if (pngSrc) {
    return (
      <img
        src={pngSrc}
        className={`${className} object-contain shrink-0`}
        style={{ width: size, height: size }}
        alt={provider}
      />
    );
  }

  // 2. Vector SVG brand icons
  switch (key) {
    case 'mega':
      return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#D9272E">
          <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm6.23 16.244a.371.371 0 0 1-.373.372H16.29a.371.371 0 0 1-.372-.372v-4.828c0-.04-.046-.06-.08-.033l-3.32 3.32a.742.742 0 0 1-1.043 0l-3.32-3.32c-.027-.027-.08-.007-.08.033v4.828a.371.371 0 0 1-.372.372H6.136a.371.371 0 0 1-.372-.372V7.757c0-.206.166-.372.372-.372h1.076a.75.75 0 0 1 .525.22l4.13 4.13a.18.18 0 0 0 .26 0l4.13-4.13c.14-.14.325-.22.525-.22h1.075c.206 0 .372.166.372.372z" />
        </svg>
      );
    case 's3':
    case 'amazon s3':
    case 'aws':
      return (
        <svg className={className} width={size} height={size} viewBox="0 0 428 512" fill="none">
          <path d="M378 99L295 257l83 158 34-19V118Z" fill="#E25444" />
          <path d="M378 99L212 118 127.5 257 212 396l166 19V99Z" fill="#7B1D13" />
          <path d="M43 99L16 111V403l27 12L212 257Z" fill="#58150D" />
          <path d="M42.6 98.7l169.6 47.1V372.4L42.6 415.1V98.7Z" fill="#E25444" />
          <path d="M212.3 170.7l-72-11.6 72-81.8 71.8 81.8Z" fill="#58150D" />
          <path d="M284.1 159.1l-71.9 11.7-71.9-11.7V77.3" stroke="#58150D" strokeWidth="4" />
          <path d="M212.3 342.2l-72 13.3 72 70.2 71.8-70.2Z" fill="#58150D" />
          <path d="M212 16l-72 38V159l72.2-20.3Z" fill="#7B1D13" />
          <path d="M212.2 196.4l-71.9 7.8V309.1l71.9 8.2V196.4Z" fill="#7B1D13" />
          <path d="M212.2 373.3L140.3 355.3V458.4L212.2 496V373.3Z" fill="#7B1D13" />
          <path d="M284.1 355.3l-71.9 18V496l71.9-37.6V355.3Z" fill="#E25444" />
          <path d="M212.2 196.4l71.9 7.8V309.1l-71.9 8.2V196.4Z" fill="#E25444" />
          <path d="M212 16l72 38V159l-72-20V16Z" fill="#E25444" />
        </svg>
      );
    case 'dropbox':
      return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#0061FF">
          <path d="M6 1.807L0 5.629l6 3.822 6.001-3.822L6 1.807zM18 1.807l-6 3.822 6 3.822 6-3.822-6-3.822zM0 13.274l6 3.822 6.001-3.822L6 9.452l-6 3.822zM18 9.452l-6 3.822 6 3.822 6-3.822-6-3.822zM6 18.371l6.001 3.822 6-3.822-6-3.822L6 18.371z" />
        </svg>
      );
    case 'box':
      return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#0061D5">
          <path d="M.959 5.523c-.54 0-.959.42-.959.899v7.549a4.59 4.59 0 004.613 4.494 4.717 4.717 0 004.135-2.457c.779 1.438 2.337 2.457 4.074 2.457 2.577 0 4.674-2.037 4.674-4.613.06-2.457-2.037-4.495-4.613-4.495-1.738 0-3.295.959-4.074 2.397-.78-1.438-2.338-2.397-4.135-2.397-1.079 0-2.038.36-2.817.899V6.422a.92.92 0 00-.898-.899zM17.602 9.26a.95.95 0 00-.704.158c-.36.3-.479.899-.18 1.318l2.397 3.116-2.396 3.115c-.3.42-.24.96.18 1.26.419.3 1.016.298 1.316-.122l2.039-2.636 2.096 2.697c.3.36.899.419 1.318.12.36-.3.42-.84.121-1.259l-2.338-3.115 2.338-3.057c.3-.419.298-1.018-.121-1.318-.48-.3-1.019-.24-1.318.18l-2.096 2.576-2.04-2.695c-.149-.18-.373-.3-.612-.338zM4.613 11.154c1.558 0 2.817 1.26 2.817 2.758 0 1.558-1.259 2.756-2.817 2.756-1.558 0-2.816-1.198-2.816-2.756 0-1.498 1.258-2.758 2.816-2.758zm8.27 0c1.558 0 2.816 1.26 2.816 2.758-.06 1.558-1.318 2.756-2.816 2.756-1.558 0-2.817-1.198-2.817-2.756 0-1.498 1.259-2.758 2.817-2.758Z" />
        </svg>
      );
    case 'webdav':
    case 'nextcloud':
      return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#0082C9">
          <path d="M12.018 6.537c-2.5 0-4.6 1.712-5.241 4.015-.56-1.232-1.793-2.105-3.225-2.105A3.569 3.569 0 0 0 0 12a3.569 3.569 0 0 0 3.552 3.553c1.432 0 2.664-.874 3.224-2.106.641 2.304 2.742 4.016 5.242 4.016 2.487 0 4.576-1.693 5.231-3.977.569 1.21 1.783 2.067 3.198 2.067A3.568 3.568 0 0 0 24 12a3.569 3.569 0 0 0-3.553-3.553c-1.416 0-2.63.858-3.199 2.067-.654-2.284-2.743-3.978-5.23-3.977zm0 2.085c1.878 0 3.378 1.5 3.378 3.378 0 1.878-1.5 3.378-3.378 3.378A3.362 3.362 0 0 1 8.641 12c0-1.878 1.5-3.378 3.377-3.378zm-8.466 1.91c.822 0 1.467.645 1.467 1.468s-.644 1.467-1.467 1.468A1.452 1.452 0 0 1 2.085 12c0-.823.644-1.467 1.467-1.467zm16.895 0c.823 0 1.468.645 1.468 1.468s-.645 1.468-1.468 1.468A1.452 1.452 0 0 1 18.98 12c0-.823.644-1.467 1.467-1.467z" />
        </svg>
      );
    case 'local':
    case 'hard-drive':
    case 'disk':
      return <HardDrive className={`${className} text-indigo-500`} size={size} />;
    case 'alibabacloud':
    case 'alibaba':
    case 'aliyun':
      return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#FF6A00">
          <path d="M3.996 4.517h5.291L8.01 6.324 4.153 7.506a1.668 1.668 0 0 0-1.165 1.601v5.786a1.668 1.668 0 0 0 1.165 1.6l3.857 1.183 1.277 1.807H3.996A3.996 3.996 0 0 1 0 15.487V8.513a3.996 3.996 0 0 1 3.996-3.996m16.008 0h-5.291l1.277 1.807 3.857 1.182c.715.227 1.17.889 1.165 1.601v5.786a1.668 1.668 0 0 1-1.165 1.6l-3.857 1.183-1.277 1.807h5.291A3.996 3.996 0 0 0 24 15.487V8.513a3.996 3.996 0 0 0-3.996-3.996m-4.007 8.345H8.002v-1.804h7.995Z" />
        </svg>
      );
    case 'cloudinary':
      return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#3448C5">
          <path d="M24 14.8598c0 2.1729-1.3757 3.974-3.5903 4.6996l-.0995.0318V17.989c1.3777-.5805 2.1869-1.7275 2.1869-3.1291-.0072-2-1.6087-3.6288-3.6082-3.6699h-.5964l-.1432-.5686c-.7025-2.8996-3.2886-4.9489-6.2721-4.97a6.3915 6.3915 0 0 0-5.811 3.664l-.1828.3757-.4175.0437a4.4311 4.4311 0 0 0-3.3052 2.088c-1.2803 2.0856-.6274 4.8143 1.4583 6.0947v1.6897h-.01l-.149-.0675a5.9402 5.9402 0 0 1-3.3658-4.3494c-.5787-3.2291 1.57-6.3161 4.7991-6.8948a7.8766 7.8766 0 0 1 6.9839-4.149c3.4724.025 6.535 2.28 7.5901 5.5883 2.5789.3366 4.5138 2.5245 4.5327 5.1251zm-15.3176-1.322h.5647a.0656.0656 0 0 0 .0457-.1113L7.084 11.2158l-.0007-.0007a.0656.0656 0 0 0-.0927.0007L4.78 13.4265a.0656.0656 0 0 0 .0477.1113h.5566a.0656.0656 0 0 1 .0657.0656v5.0574c0 .6588.534 1.1928 1.1928 1.1928H9.247a.0656.0656 0 0 0 .0457-.1113l-.33-.33a1.1928 1.1928 0 0 1-.348-.839v-4.97a.0676.0676 0 0 1 .0676-.0655zm9.769 2.5466h.5667a.0655.0655 0 0 0 .0457-.1133l-2.2107-2.2087-.0015-.0015a.0636.0636 0 0 0-.0899.0015L14.551 15.971a.0657.0657 0 0 0 .0457.1133h.5567a.0656.0656 0 0 1 .0656.0656v2.5108c0 .6588.534 1.1928 1.1928 1.1928h2.6063a.0655.0655 0 0 0 .0457-.1113l-.33-.33a1.1928 1.1928 0 0 1-.348-.839V16.15a.0656.0656 0 0 1 .0657-.0656zm-4.8844-1.2743h.5646a.0656.0656 0 0 0 .0477-.1114l-2.2107-2.2027-.0006-.0006a.0656.0656 0 0 0-.0928.0006l-2.2087 2.2068a.0656.0656 0 0 0 .0457.1113h.5626a.0676.0676 0 0 1 .0657.0676v3.7791c0 .6588.534 1.1928 1.1928 1.1928h2.5983a.0656.0656 0 0 0 .0477-.1113l-.332-.33a1.193 1.193 0 0 1-.346-.839v-3.6956c0-.0366.0291-.0665.0657-.0676z" />
        </svg>
      );
    case 'googlephotos':
    case 'google-photos':
    case 'google photos':
      return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M12.678 1.388l-.003 9.972c6.56-.465 6.598-9.532.003-9.972z" fill="#EA4335" />
          <path d="M12.638 12.68c.682 6.875 9.67 6.284 9.977.01l-9.977-.01z" fill="#FBBC04" />
          <path d="M11.318 22.612l-.001-9.97c-6.927.598-6.29 9.726.002 9.97z" fill="#34A853" />
          <path d="M1.4 11.315l9.95.008c-.527-6.829-9.762-6.367-9.95-.008z" fill="#4285F4" />
        </svg>
      );
    case 'huaweidrive':
    case 'huawei':
      return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#CF0A2C">
          <path d="M3.67 6.14S1.82 7.91 1.72 9.78v.35c.08 1.51 1.22 2.4 1.22 2.4 1.83 1.79 6.26 4.04 7.3 4.55 0 0 .06.03.1-.01l.02-.04v-.04C7.52 10.8 3.67 6.14 3.67 6.14zM9.65 18.6c-.02-.08-.1-.08-.1-.08l-7.38.26c.8 1.43 2.15 2.53 3.56 2.2.96-.25 3.16-1.78 3.88-2.3.06-.05.04-.09.04-.09zm.08-.78C6.49 15.63.21 12.28.21 12.28c-.15.46-.2.9-.21 1.3v.07c0 1.07.4 1.82.4 1.82.8 1.69 2.34 2.2 2.34 2.2.7.3 1.4.31 1.4.31.12.02 4.4 0 5.54 0 .05 0 .08-.05.08-.05v-.06c0-.03-.03-.05-.03-.05zM9.06 3.19a3.42 3.42 0 00-2.57 3.15v.41c.03.6.16 1.05.16 1.05.66 2.9 3.86 7.65 4.55 8.65.05.05.1.03.1.03a.1.1 0 00.06-.1c1.06-10.6-1.11-13.42-1.11-13.42-.32.02-1.19.23-1.19.23zm8.299 2.27s-.49-1.8-2.44-2.28c0 0-.57-.14-1.17-.22 0 0-2.18 2.81-1.12 13.43.01.07.06.08.06.08.07.03.1-.03.1-.03.72-1.03 3.9-5.76 4.55-8.64 0 0 .36-1.4.02-2.34zm-2.92 13.07s-.07 0-.09.05c0 0-.01.07.03.1.7.51 2.85 2 3.88 2.3 0 0 .16.05.43.06h.14c.69-.02 1.9-.37 3-2.26l-7.4-.25zm7.83-8.41c.14-2.06-1.94-3.97-1.94-3.98 0 0-3.85 4.66-6.67 10.8 0 0-.03.08.02.13l.04.01h.06c1.06-.53 5.46-2.77 7.28-4.54 0 0 1.15-.93 1.21-2.42zm1.52 2.14s-6.28 3.37-9.52 5.55c0 0-.05.04-.03.11 0 0 .03.06.07.06 1.16 0 5.56 0 5.67-.02 0 0 .57-.02 1.27-.29 0 0 1.56-.5 2.37-2.27 0 0 .73-1.45.17-3.14z" />
        </svg>
      );
    case 'iclouddrive':
    case 'icloud':
      return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="icloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5AC8FA" />
              <stop offset="100%" stopColor="#007AFF" />
            </linearGradient>
          </defs>
          <path
            d="M13.762 4.29a6.51 6.51 0 0 0-5.669 3.332 3.571 3.571 0 0 0-1.558-.36 3.571 3.571 0 0 0-3.516 3A4.918 4.918 0 0 0 0 14.796a4.918 4.918 0 0 0 4.92 4.914 4.93 4.93 0 0 0 .617-.045h14.42c2.305-.272 4.041-2.258 4.043-4.589v-.009a4.594 4.594 0 0 0-3.727-4.508 6.51 6.51 0 0 0-6.511-6.27z"
            fill="url(#icloudGrad)"
          />
        </svg>
      );
    case 'mailru':
    case 'mail.ru':
      return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#005FF9">
          <path d="M15.61 12c0 1.99-1.62 3.61-3.61 3.61-1.99 0-3.61-1.62-3.61-3.61 0-1.99 1.62-3.61 3.61-3.61 1.99 0 3.61 1.62 3.61 3.61M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12c2.424 0 4.761-.722 6.76-2.087l.034-.024-1.617-1.879-.027.017A9.494 9.494 0 0 1 12 21.54c-5.26 0-9.54-4.28-9.54-9.54 0-5.26 4.28-9.54 9.54-9.54 5.26 0 9.54 4.28 9.54 9.54a9.63 9.63 0 0 1-.225 2.05c-.301 1.239-1.169 1.618-1.82 1.568-.654-.053-1.42-.52-1.426-1.661V12A6.076 6.076 0 0 0 12 5.93 6.076 6.076 0 0 0 5.93 12 6.076 6.076 0 0 0 12 18.07a6.02 6.02 0 0 0 4.3-1.792 3.9 3.9 0 0 0 3.32 1.805c.874 0 1.74-.292 2.437-.821.719-.547 1.256-1.336 1.553-2.285.047-.154.135-.504.135-.507l.002-.013c.175-.76.253-1.52.253-2.457 0-6.617-5.383-12-12-12" />
        </svg>
      );
    case 'pikpak':
      return (
        <svg className={className} width={size} height={size} viewBox="0 0 192 192" fill="none">
          <rect width="192" height="192" rx="42" fill="#2979FF" />
          <path d="M23.3 57.5L82.5 37M168.7 57.5L109.5 37" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" />
          <path d="M170 58.7v82.5c0 1.2-.1 5.3-3.2 8.9-4 4.8-9.8 4.9-10.6 4.9H35.8c-.9 0-6.6-.1-10.6-4.9-3.1-3.6-3.2-7.8-3.2-8.9V58.7c0-.5.4-1 1-1h146c.6 0 1 .4 1 1z" stroke="#FFFFFF" strokeWidth="12" fill="#2979FF" />
          <path d="M69.7 111c3.8 0 6.9-3.1 6.9-6.9V89.6c0-3.8-3.1-6.9-6.9-6.9-3.8 0-6.9 3.1-6.9 6.9v14.6c0 3.8 3.1 6.8 6.9 6.8z" fill="#FFFFFF" />
          <path d="M122.3 111c-3.8 0-6.9-3.1-6.9-6.9V89.6c0-3.8 3.1-6.9 6.9-6.9 3.8 0 6.9 3.1 6.9 6.9v14.6c0 3.8-3.1 6.8-6.9 6.8z" fill="#FFFFFF" />
          <path d="M96 133.4c-3-.1-7-.2-11.5-1.5-3.4-1-6.2-2.3-8.4-3.5M96 133.4c3-.1 7-.2 11.5-1.5 3.4-1 6.2-2.3 8.4-3.5" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" />
        </svg>
      );
    case 'zohoworkdrive':
    case 'zoho':
      return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="9" height="9" rx="2" fill="#E42528" />
          <rect x="13" y="2" width="9" height="9" rx="2" fill="#00A859" />
          <rect x="2" y="13" width="9" height="9" rx="2" fill="#0083CA" />
          <rect x="13" y="13" width="9" height="9" rx="2" fill="#F9A01B" />
          <path d="M8.5 6.5h-4v4h4v-4z" fill="#FFFFFF" fillOpacity="0.25" />
          <path d="M19.5 6.5h-4v4h4v-4z" fill="#FFFFFF" fillOpacity="0.25" />
          <path d="M8.5 17.5h-4v4h4v-4z" fill="#FFFFFF" fillOpacity="0.25" />
          <path d="M19.5 17.5h-4v4h4v-4z" fill="#FFFFFF" fillOpacity="0.25" />
        </svg>
      );
    case 'oracleobjectstorage':
    case 'oci':
    case 'oracle':
      return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#312D2A" />
          <path d="M12 5.5A6.5 6.5 0 0 0 5.5 12a6.5 6.5 0 0 0 6.5 6.5h3a6.5 6.5 0 0 0 0-13h-3zm0 2.5h3a4 4 0 0 1 0 8h-3a4 4 0 0 1 0-8z" fill="#F80000" />
        </svg>
      );
    case 'filen':
      return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#0D1117" />
          <path d="M12 3l7.5 4.33v8.66L12 20.33 4.5 16V7.33L12 3z" stroke="#00D2FF" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M12 7.5v9M8 10h8" stroke="#00D2FF" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'sftp':
    case 'ssh':
      return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#1E293B" />
          <path d="M5 8l4 4-4 4M12 16h7" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'ftp':
      return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#0F766E" />
          <path d="M8 7h8M8 12h5M8 17h8" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'smb':
      return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#4338CA" />
          <rect x="5" y="6" width="6" height="5" rx="1" stroke="#FFFFFF" strokeWidth="1.5" />
          <rect x="13" y="6" width="6" height="5" rx="1" stroke="#FFFFFF" strokeWidth="1.5" />
          <rect x="9" y="13" width="6" height="5" rx="1" stroke="#FFFFFF" strokeWidth="1.5" />
          <path d="M8 11v2h8v-2" stroke="#FFFFFF" strokeWidth="1.5" />
        </svg>
      );
    case 'http':
    case 'https':
      return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#2563EB" />
          <circle cx="12" cy="12" r="7" stroke="#FFFFFF" strokeWidth="1.5" />
          <path d="M5 12h14M12 5a10 10 0 0 1 0 14 10 10 0 0 1 0-14" stroke="#FFFFFF" strokeWidth="1.5" />
        </svg>
      );
    case 'hdfs':
    case 'hadoop':
      return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#FFD100" />
          <path d="M7 15c-1 0-2-1-2-3 0-2.5 2-4.5 4.5-4.5H15c2 0 3.5 1.5 3.5 3.5v4h-2v-3.5a1.5 1.5 0 0 0-1.5-1.5H9.5C8 10 7 11 7 12.5s1 2.5 2.5 2.5H11v2H9.5A4.5 4.5 0 0 1 5 12.5" fill="#1A1A1A" />
          <circle cx="15.5" cy="11.5" r="1" fill="#1A1A1A" />
        </svg>
      );
    case 'fichier':
    case '1fichier':
      return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#EA580C" />
          <path d="M10 7h2v10h-2V9.5L8.5 11 7.5 9.5 10 7z" fill="#FFFFFF" />
          <path d="M14 7h4v2h-4V7zm0 4h3v2h-3v-2z" fill="#FFFFFF" />
        </svg>
      );
    case 'internetarchive':
    case 'archive':
      return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#333333">
          <path d="M12 2L2 7v2h20V7L12 2zm-8 8v9h3v-9H4zm5 0v9h3v-9H9zm5 0v9h3v-9h-3zm5 0v9h3v-9h-3zM2 20v2h20v-2H2z" />
        </svg>
      );
    case 'anycloud':
    case 'any-cloud':
    case 'any cloud':
      return (
        <img
          src={appIcon}
          className={`${className} object-contain shrink-0`}
          style={{ width: size, height: size }}
          alt="Any Cloud"
        />
      );
    default:
      return (
        <img
          src={appIcon}
          className={`${className} object-contain shrink-0`}
          style={{ width: size, height: size }}
          alt="Storage Provider"
        />
      );
  }
};

export const AppIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'w-5 h-5',
  size = 20,
}) => (
  <img
    src={appIcon}
    alt="Any Cloud"
    className={`${className} object-contain shrink-0`}
    style={{ width: size, height: size }}
  />
);

export const FileIcon: React.FC<{
  isDir: boolean;
  name: string;
  mimeType?: string | null;
  className?: string;
  size?: number;
}> = ({ isDir, name, mimeType, className = 'w-5 h-5', size = 20 }) => {
  if (isDir) {
    return <Folder className={`${className} text-amber-400 fill-amber-400/20`} size={size} />;
  }

  const ext = name.split('.').pop()?.toLowerCase() || '';

  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
    return <ImageIcon className={`${className} text-rose-500`} size={size} />;
  }
  if (['mp4', 'mkv', 'mov', 'avi'].includes(ext)) {
    return <Video className={`${className} text-purple-500`} size={size} />;
  }
  if (['mp3', 'wav', 'flac'].includes(ext)) {
    return <Music className={`${className} text-pink-500`} size={size} />;
  }
  if (['pdf'].includes(ext)) {
    return <FileText className={`${className} text-red-500`} size={size} />;
  }
  if (['doc', 'docx', 'txt', 'rtf', 'md'].includes(ext)) {
    return <FileText className={`${className} text-blue-500`} size={size} />;
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return <FileSpreadsheet className={`${className} text-emerald-500`} size={size} />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <Archive className={`${className} text-amber-600`} size={size} />;
  }
  if (['ts', 'tsx', 'js', 'jsx', 'rs', 'py', 'json', 'html', 'css'].includes(ext)) {
    return <FileCode className={`${className} text-cyan-500`} size={size} />;
  }

  return <File className={`${className} text-muted-foreground`} size={size} />;
};
