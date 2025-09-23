// OIDC Authentication Configuration for Pauhu Demo

const AUTH = {
    issuer:      "https://auth.pauhu.ai",
    authorize:   "https://auth.pauhu.ai/authorize", 
    token:       "https://auth.pauhu.ai/token",
    client_id:   "pauhu-demo-hamina",
    redirect_uri: "https://demo.pauhu.ai/haminanenergia/",
    scope:       "openid profile offline_access api.read api.write"
};

// For local development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    AUTH.redirect_uri = window.location.origin + "/haminanenergia/";
}

// Build authorization URL
function buildAuthUrl() {
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: AUTH.client_id,
        redirect_uri: AUTH.redirect_uri,
        scope: AUTH.scope,
        state: generateState(),
        nonce: generateNonce()
    });
    
    return `${AUTH.authorize}?${params.toString()}`;
}

// Exchange authorization code for token
async function exchangeCodeForToken(code) {
    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: AUTH.client_id,
        redirect_uri: AUTH.redirect_uri
    });
    
    try {
        const response = await fetch(AUTH.token, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });
        
        if (!response.ok) {
            throw new Error(`Token exchange failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Store tokens
        if (data.access_token) {
            localStorage.setItem('pauhu_token', data.access_token);
            
            if (data.refresh_token) {
                localStorage.setItem('pauhu_refresh_token', data.refresh_token);
            }
            
            // Decode and store user info
            const userInfo = parseJwt(data.id_token || data.access_token);
            localStorage.setItem('pauhu_user', JSON.stringify({
                name: userInfo.name || userInfo.preferred_username || 'User',
                email: userInfo.email,
                sub: userInfo.sub
            }));
            
            return data.access_token;
        }
        
        throw new Error('No access token received');
        
    } catch (error) {
        console.error('Token exchange error:', error);
        throw error;
    }
}

// Refresh access token
async function refreshToken() {
    const refreshToken = localStorage.getItem('pauhu_refresh_token');
    if (!refreshToken) {
        return null;
    }
    
    const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: AUTH.client_id
    });
    
    try {
        const response = await fetch(AUTH.token, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });
        
        if (!response.ok) {
            throw new Error(`Token refresh failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.access_token) {
            localStorage.setItem('pauhu_token', data.access_token);
            
            if (data.refresh_token) {
                localStorage.setItem('pauhu_refresh_token', data.refresh_token);
            }
            
            return data.access_token;
        }
        
    } catch (error) {
        console.error('Token refresh error:', error);
        // Clear invalid tokens
        localStorage.removeItem('pauhu_token');
        localStorage.removeItem('pauhu_refresh_token');
        return null;
    }
}

// Parse JWT token
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join('')
        );
        
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('Failed to parse JWT:', e);
        return {};
    }
}

// Generate random state for CSRF protection
function generateState() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, array))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

// Generate nonce for replay attack protection
function generateNonce() {
    return generateState(); // Same implementation
}

// Auto-refresh token before expiry
function setupTokenRefresh() {
    const token = localStorage.getItem('pauhu_token');
    if (!token) return;
    
    const payload = parseJwt(token);
    const expiresAt = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const refreshIn = expiresAt - now - (5 * 60 * 1000); // Refresh 5 min before expiry
    
    if (refreshIn > 0) {
        setTimeout(async () => {
            const newToken = await refreshToken();
            if (newToken) {
                setupTokenRefresh(); // Schedule next refresh
            } else {
                // Force re-login
                window.location.href = buildAuthUrl();
            }
        }, refreshIn);
    }
}

// Initialize token refresh on load
if (localStorage.getItem('pauhu_token')) {
    setupTokenRefresh();
}