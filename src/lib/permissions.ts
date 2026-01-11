/**
 * PWA Permissions Handler
 * Handles camera, location, and notification permissions for PWA
 */

export type PermissionType = 'camera' | 'location' | 'notifications';

export interface PermissionResult {
  granted: boolean;
  state: PermissionState | 'unsupported';
  error?: string;
}

/**
 * Check if running in a secure context (HTTPS or localhost)
 * Required for most PWA features
 */
export function isSecureContext(): boolean {
  return window.isSecureContext || window.location.hostname === 'localhost';
}

/**
 * Check if browser supports the Permissions API
 */
export function supportsPermissionsAPI(): boolean {
  return 'permissions' in navigator;
}

/**
 * Request camera permission with proper error handling
 */
export async function requestCameraPermission(): Promise<PermissionResult> {
  if (!isSecureContext()) {
    return {
      granted: false,
      state: 'unsupported',
      error: 'Camera requires HTTPS connection',
    };
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      granted: false,
      state: 'unsupported',
      error: 'Camera not supported in this browser',
    };
  }

  try {
    // Check current permission state if Permissions API is available
    if (supportsPermissionsAPI()) {
      try {
        // @ts-ignore - camera permission not fully typed
        const permissionStatus = await navigator.permissions.query({ name: 'camera' });
        
        if (permissionStatus.state === 'denied') {
          return {
            granted: false,
            state: 'denied',
            error: 'Camera permission was previously denied. Please enable it in your browser settings.',
          };
        }
      } catch (e) {
        // Permissions query might fail, continue with getUserMedia
        console.log('Permissions query failed, proceeding with getUserMedia');
      }
    }

    // Request camera access - this will trigger browser permission prompt
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    });

    // Stop the stream immediately - we just wanted to check permission
    stream.getTracks().forEach(track => track.stop());

    return {
      granted: true,
      state: 'granted',
    };
  } catch (error: any) {
    const errorName = error?.name || '';
    const errorMessage = error?.message || '';

    if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
      return {
        granted: false,
        state: 'denied',
        error: 'Camera permission denied. Please allow camera access and try again.',
      };
    }

    if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
      return {
        granted: false,
        state: 'unsupported',
        error: 'No camera found on this device.',
      };
    }

    if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
      return {
        granted: false,
        state: 'denied',
        error: 'Camera is already in use by another application.',
      };
    }

    return {
      granted: false,
      state: 'denied',
      error: errorMessage || 'Unable to access camera',
    };
  }
}

/**
 * Request location permission with proper error handling
 */
export async function requestLocationPermission(): Promise<PermissionResult> {
  if (!isSecureContext()) {
    return {
      granted: false,
      state: 'unsupported',
      error: 'Location requires HTTPS connection',
    };
  }

  if (!navigator.geolocation) {
    return {
      granted: false,
      state: 'unsupported',
      error: 'Geolocation not supported in this browser',
    };
  }

  try {
    // Check current permission state if Permissions API is available
    if (supportsPermissionsAPI()) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        
        if (permissionStatus.state === 'denied') {
          return {
            granted: false,
            state: 'denied',
            error: 'Location permission was previously denied. Please enable it in your browser settings.',
          };
        }
      } catch (e) {
        console.log('Permissions query failed for geolocation');
      }
    }

    // Request location access - this will trigger browser permission prompt
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            granted: true,
            state: 'granted',
          });
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            resolve({
              granted: false,
              state: 'denied',
              error: 'Location permission denied. Please allow location access and try again.',
            });
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            resolve({
              granted: false,
              state: 'granted', // Permission granted but position unavailable
              error: 'Location unavailable. Please check your device settings.',
            });
          } else {
            resolve({
              granted: false,
              state: 'denied',
              error: error.message || 'Unable to access location',
            });
          }
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  } catch (error: any) {
    return {
      granted: false,
      state: 'denied',
      error: error?.message || 'Unable to access location',
    };
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<PermissionResult> {
  if (!('Notification' in window)) {
    return {
      granted: false,
      state: 'unsupported',
      error: 'Notifications not supported in this browser',
    };
  }

  if (Notification.permission === 'denied') {
    return {
      granted: false,
      state: 'denied',
      error: 'Notification permission was previously denied. Please enable it in your browser settings.',
    };
  }

  if (Notification.permission === 'granted') {
    return {
      granted: true,
      state: 'granted',
    };
  }

  try {
    const permission = await Notification.requestPermission();
    return {
      granted: permission === 'granted',
      state: permission,
    };
  } catch (error: any) {
    return {
      granted: false,
      state: 'denied',
      error: error?.message || 'Unable to request notification permission',
    };
  }
}

/**
 * Check camera permission status without requesting
 */
export async function checkCameraPermission(): Promise<PermissionResult> {
  if (!isSecureContext()) {
    return { granted: false, state: 'unsupported', error: 'HTTPS required' };
  }

  if (!supportsPermissionsAPI()) {
    return { granted: false, state: 'prompt' as PermissionState };
  }

  try {
    // @ts-ignore
    const permissionStatus = await navigator.permissions.query({ name: 'camera' });
    return {
      granted: permissionStatus.state === 'granted',
      state: permissionStatus.state,
    };
  } catch (e) {
    return { granted: false, state: 'prompt' as PermissionState };
  }
}

/**
 * Check location permission status without requesting
 */
export async function checkLocationPermission(): Promise<PermissionResult> {
  if (!isSecureContext()) {
    return { granted: false, state: 'unsupported', error: 'HTTPS required' };
  }

  if (!supportsPermissionsAPI()) {
    return { granted: false, state: 'prompt' as PermissionState };
  }

  try {
    const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
    return {
      granted: permissionStatus.state === 'granted',
      state: permissionStatus.state,
    };
  } catch (e) {
    return { granted: false, state: 'prompt' as PermissionState };
  }
}

/**
 * Open browser settings to manage permissions
 * Note: This is not directly possible, but we can guide the user
 */
export function getPermissionInstructions(type: PermissionType): string {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  if (isMobile) {
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      // iOS Safari
      return `To enable ${type}:\n1. Go to Settings > Safari\n2. Tap on this website\n3. Enable ${type} access`;
    } else {
      // Android Chrome/Firefox
      return `To enable ${type}:\n1. Tap the lock icon in the address bar\n2. Tap "Permissions"\n3. Enable ${type} access`;
    }
  } else {
    // Desktop
    return `To enable ${type}:\n1. Click the lock icon in the address bar\n2. Click "Site settings" or "Permissions"\n3. Enable ${type} access`;
  }
}
