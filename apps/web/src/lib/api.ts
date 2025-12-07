// API client for Caddy Proxy Manager backend
// Using relative URLs - Next.js rewrites will proxy to backend
const API_BASE = '';

export interface Site {
    id: string;
    name: string;
    hosts: string[];
    listen_port: number;
    auto_https: boolean;
    tls_enabled: boolean;
    enabled: boolean;
    created_at: string;
    updated_at: string;
    routes?: Route[];
}

export interface Route {
    id: string;
    site_id: string;
    name: string;
    path_matcher: string;
    match_type: string;
    methods: string[] | null;
    handler_type: string;
    handler_config: string;
    order: number;
    enabled: boolean;
    created_at: string;
    updated_at: string;
}

export interface Upstream {
    id: string;
    name: string;
    address: string;
    scheme: string;
    weight: number;
    max_requests: number;
    max_connections: number;
    health_check_path: string;
    health_check_interval: number;
    healthy: boolean;
    enabled: boolean;
    created_at: string;
    updated_at: string;
}

export interface UpstreamGroup {
    id: string;
    name: string;
    load_balancing: string;
    try_duration: number;
    try_interval: number;
    health_checks: boolean;
    passive_health: boolean;
    retries: number;
    upstreams?: Upstream[];
}

export interface ConfigHistory {
    id: string;
    timestamp: string;
    action: string;
    resource_type: string;
    resource_id: string;
    resource_name: string;
    previous_state: string;
    new_state: string;
    success: boolean;
    error_message?: string;
}

export interface HealthStatus {
    status: string;
    version: string;
    go_version: string;
    num_cpu: number;
    components: {
        caddy: string;
        database: string;
    };
}

// Timeout configuration (in milliseconds)
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const LOGIN_TIMEOUT = 60000; // 60 seconds for login (bcrypt can be slow)

async function fetchAPI<T>(
    endpoint: string,
    options?: RequestInit,
    timeoutMs?: number
): Promise<T> {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeout = timeoutMs || DEFAULT_TIMEOUT;

    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        // Don't set Content-Type for FormData - browser will set it with boundary
        const isFormData = options?.body instanceof FormData;
        const headers: Record<string, string> = isFormData
            ? {}
            : { 'Content-Type': 'application/json' };

        const res = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            credentials: 'include', // Include cookies for auth
            signal: controller.signal,
            headers: {
                ...headers,
                ...options?.headers,
            },
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            try {
                const errorData = await res.json();
                throw new Error(errorData.error || errorData.message || `API error: ${res.status}`);
            } catch (e) {
                if (e instanceof Error && e.message !== `API error: ${res.status}`) {
                    throw e;
                }
                throw new Error(`API error: ${res.status}`);
            }
        }

        return res.json();
    } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                throw new Error(`Request timeout after ${timeout / 1000}s. Please try again.`);
            }
            throw error;
        }
        throw new Error('Network request failed');
    }
}

// Health
export const getHealth = () => fetchAPI<HealthStatus>('/api/health');

// Sites
export const getSites = () => fetchAPI<{ sites: Site[] }>('/api/sites');
export const getSite = (id: string) => fetchAPI<Site>(`/api/sites/${id}`);
export const createSite = (data: Partial<Site>) =>
    fetchAPI<Site>('/api/sites', { method: 'POST', body: JSON.stringify(data) });
export const updateSite = (id: string, data: Partial<Site>) =>
    fetchAPI<Site>(`/api/sites/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteSite = (id: string) =>
    fetchAPI<{ message: string }>(`/api/sites/${id}`, { method: 'DELETE' });

// Routes
export const getRoutes = (siteId: string) =>
    fetchAPI<{ routes: Route[] }>(`/api/sites/${siteId}/routes`);
export const createRoute = (siteId: string, data: Partial<Route>) =>
    fetchAPI<Route>(`/api/sites/${siteId}/routes`, { method: 'POST', body: JSON.stringify(data) });
export const updateRoute = (id: string, data: Partial<Route>) =>
    fetchAPI<Route>(`/api/routes/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteRoute = (id: string) =>
    fetchAPI<{ message: string }>(`/api/routes/${id}`, { method: 'DELETE' });

// Upstreams
export const getUpstreams = () => fetchAPI<{ upstreams: Upstream[] }>('/api/upstreams');
export const createUpstream = (data: Partial<Upstream>) =>
    fetchAPI<Upstream>('/api/upstreams', { method: 'POST', body: JSON.stringify(data) });
export const updateUpstream = (id: string, data: Partial<Upstream>) =>
    fetchAPI<Upstream>(`/api/upstreams/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteUpstream = (id: string) =>
    fetchAPI<{ message: string }>(`/api/upstreams/${id}`, { method: 'DELETE' });

// Upstream Groups
export const getUpstreamGroups = () =>
    fetchAPI<{ upstream_groups: UpstreamGroup[] }>('/api/upstream-groups');
export const createUpstreamGroup = (data: Partial<UpstreamGroup>) =>
    fetchAPI<UpstreamGroup>('/api/upstream-groups', { method: 'POST', body: JSON.stringify(data) });

// Config
export const getConfig = () => fetchAPI<Record<string, unknown>>('/api/config');
export const syncConfig = () =>
    fetchAPI<{ message: string; config: Record<string, unknown> }>('/api/config/sync', { method: 'POST' });

// History
export const getHistory = (params?: { limit?: number; resource_type?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.resource_type) query.set('resource_type', params.resource_type);
    return fetchAPI<{ history: ConfigHistory[]; total: number }>(`/api/history?${query}`);
};
export const rollbackHistory = (id: string) =>
    fetchAPI<{ message: string }>(`/api/history/${id}/rollback`, { method: 'POST' });

// TLS Configuration
export interface TLSConfig {
    id?: string;
    site_id: string;
    auto_https: boolean;
    acme_email: string;
    acme_provider: string;
    on_demand_tls: boolean;
    wildcard_cert: boolean;
    dns_provider_id?: string;
    custom_cert_path: string;
    custom_key_path: string;
    min_version: string;
    cipher_suites: string;
}

export const getTLSConfig = (siteId: string) =>
    fetchAPI<TLSConfig>(`/api/sites/${siteId}/tls`);
export const updateTLSConfig = (siteId: string, data: Partial<TLSConfig>) =>
    fetchAPI<TLSConfig>(`/api/sites/${siteId}/tls`, { method: 'PUT', body: JSON.stringify(data) });

// Custom Certificates
export interface CustomCertificate {
    id: string;
    name: string;
    domains: string[];
    cert_pem: string;
    expires_at: string;
    created_at: string;
}

export interface CustomCertificateDetail extends CustomCertificate {
    key_pem: string;
}

export const getCertificates = () =>
    fetchAPI<{ certificates: CustomCertificate[] }>('/api/certificates');

export const getCertificate = (id: string) =>
    fetchAPI<CustomCertificateDetail>(`/api/certificates/${id}`);

export const uploadCertificate = (data: FormData) =>
    fetchAPI<CustomCertificate>('/api/certificates', {
        method: 'POST',
        body: data,
        headers: {
            // Content-Type must be undefined so browser sets boundary
        },
    });

export const deleteCertificate = (id: string) =>
    fetchAPI<{ message: string }>(`/api/certificates/${id}`, { method: 'DELETE' });

// Global Settings
export interface GlobalSettings {
    id?: string;
    admin_email: string;
    default_acme_provider: string;
    log_level: string;
    access_log_enabled: boolean;
    grace_period: number;
    http_port: number;
    https_port: number;
    // TLS Settings
    default_acme_email: string;
    default_min_tls: string;
    on_demand_tls_enabled: boolean;
    hsts_enabled: boolean;
    hsts_max_age: number;
    hsts_include_subs: boolean;
    hsts_preload: boolean;
}

export const getGlobalSettings = () => fetchAPI<GlobalSettings>('/api/settings');
export const updateGlobalSettings = (data: Partial<GlobalSettings>) =>
    fetchAPI<GlobalSettings>('/api/settings', { method: 'PUT', body: JSON.stringify(data) });

// Upstream Groups (expanded)
export const getUpstreamGroup = (id: string) =>
    fetchAPI<UpstreamGroup>(`/api/upstream-groups/${id}`);
export const updateUpstreamGroup = (id: string, data: Partial<UpstreamGroup>) =>
    fetchAPI<UpstreamGroup>(`/api/upstream-groups/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteUpstreamGroup = (id: string) =>
    fetchAPI<{ message: string }>(`/api/upstream-groups/${id}`, { method: 'DELETE' });

// Middleware Settings
export interface MiddlewareSettings {
    id?: string;
    site_id: string;
    compression_enabled: boolean;
    compression_types: string;
    compression_level: number;
    basic_auth_enabled: boolean;
    basic_auth_realm: string;
    access_control_enabled: boolean;
    access_control_default: string;
}

export const getMiddlewareSettings = (siteId: string) =>
    fetchAPI<MiddlewareSettings>(`/api/sites/${siteId}/middleware`);
export const updateMiddlewareSettings = (siteId: string, data: Partial<MiddlewareSettings>) =>
    fetchAPI<MiddlewareSettings>(`/api/sites/${siteId}/middleware`, { method: 'PUT', body: JSON.stringify(data) });

// Basic Auth Users
export interface BasicAuthUser {
    id: string;
    site_id: string;
    username: string;
    password_hash: string;
    realm: string;
    enabled: boolean;
}


export const getBasicAuthUsers = (siteId: string) =>
    fetchAPI<{ users: BasicAuthUser[] }>(`/api/sites/${siteId}/auth/users`);
export const createBasicAuthUser = (siteId: string, data: { username: string; password: string; realm?: string }) =>
    fetchAPI<BasicAuthUser>(`/api/sites/${siteId}/auth/users`, { method: 'POST', body: JSON.stringify(data) });
export const deleteBasicAuthUser = (siteId: string, id: string) =>
    fetchAPI<{ message: string }>(`/api/sites/${siteId}/auth/users/${id}`, { method: 'DELETE' });


// Header Rules
export interface HeaderRule {
    id: string;
    site_id: string;
    direction: string;
    operation: string;
    header_name: string;
    header_value: string;
    priority: number;
    enabled: boolean;
}

export const getHeaderRules = (siteId: string) =>
    fetchAPI<{ rules: HeaderRule[] }>(`/api/sites/${siteId}/headers`);
export const createHeaderRule = (siteId: string, data: Partial<HeaderRule>) =>
    fetchAPI<HeaderRule>(`/api/sites/${siteId}/headers`, { method: 'POST', body: JSON.stringify(data) });
export const deleteHeaderRule = (id: string) =>
    fetchAPI<{ message: string }>(`/api/headers/${id}`, { method: 'DELETE' });

// Access Rules
export interface AccessRule {
    id: string;
    site_id: string;
    rule_type: string;
    cidr: string;
    priority: number;
    enabled: boolean;
}

export const getAccessRules = (siteId: string) =>
    fetchAPI<{ rules: AccessRule[] }>(`/api/sites/${siteId}/access`);
export const createAccessRule = (siteId: string, data: Partial<AccessRule>) =>
    fetchAPI<AccessRule>(`/api/sites/${siteId}/access`, { method: 'POST', body: JSON.stringify(data) });
export const deleteAccessRule = (id: string) =>
    fetchAPI<{ message: string }>(`/api/access/${id}`, { method: 'DELETE' });

// Rewrite Rules
export interface RewriteRule {
    id: string;
    site_id: string;
    match_type: string;
    pattern: string;
    replacement: string;
    strip_prefix: string;
    priority: number;
    enabled: boolean;
}

export const getRewriteRules = (siteId: string) =>
    fetchAPI<{ rules: RewriteRule[] }>(`/api/sites/${siteId}/rewrites`);
export const createRewriteRule = (siteId: string, data: Partial<RewriteRule>) =>
    fetchAPI<RewriteRule>(`/api/sites/${siteId}/rewrites`, { method: 'POST', body: JSON.stringify(data) });
export const deleteRewriteRule = (id: string) =>
    fetchAPI<{ message: string }>(`/api/rewrites/${id}`, { method: 'DELETE' });

// Redirect Rules
export interface RedirectRule {
    id: string;
    site_id: string;
    source: string;
    destination: string;
    code: number;
    priority: number;
    enabled: boolean;
}

export const getRedirectRules = (siteId: string) =>
    fetchAPI<{ rules: RedirectRule[] }>(`/api/sites/${siteId}/redirects`);
export const createRedirectRule = (siteId: string, data: Partial<RedirectRule>) =>
    fetchAPI<RedirectRule>(`/api/sites/${siteId}/redirects`, { method: 'POST', body: JSON.stringify(data) });
export const deleteRedirectRule = (id: string) =>
    fetchAPI<{ message: string }>(`/api/redirects/${id}`, { method: 'DELETE' });

// Auth API
export interface LoginResponse {
    success: boolean;
    message: string;
    expires_in: number;
    user: { username: string };
}

export interface CurrentUser {
    authenticated: boolean;
    user: { username: string };
}

export const login = (username: string, password: string) =>
    fetchAPI<LoginResponse>(
        '/api/auth/login',
        { method: 'POST', body: JSON.stringify({ username, password }) },
        LOGIN_TIMEOUT // Use longer timeout for login due to bcrypt
    );

export const logout = () =>
    fetchAPI<{ success: boolean; message: string }>('/api/auth/logout', { method: 'POST' });

export const getCurrentUser = () =>
    fetchAPI<CurrentUser>('/api/auth/me');

// Backup
export const getBackup = () => fetchAPI<object>('/api/backup');
export const restoreBackup = (data: object) =>
    fetchAPI<{ message: string; stats: object }>('/api/backup/restore', { method: 'POST', body: JSON.stringify(data) });

// Metrics
export interface Metrics {
    uptime_seconds: number;
    uptime_human: string;
    requests_total: number;
    errors_total: number;
    memory: { alloc_mb: number; total_alloc_mb: number; sys_mb: number; num_gc: number };
    runtime: { goroutines: number; cpus: number; go_version: string };
    entities: { sites: number; routes: number; upstreams: number; groups: number; healthy: number };
}

export const getMetrics = () => fetchAPI<Metrics>('/api/metrics');

// Caddy Native Metrics
export interface CaddyMetrics {
    http: {
        requests_total: number;
        requests_in_flight: number;
        request_errors_total: number;
        avg_duration_ms: number;
    };
    reverse_proxy: {
        upstreams_healthy: number;
        upstreams_total: number;
        upstreams?: { address: string; healthy: boolean }[];
    };
    admin: {
        requests_total: number;
        errors_total: number;
        requests_by_path?: Record<string, number>;
    };
    config: {
        last_reload_success: boolean;
        last_reload_timestamp: number;
    };
    process: {
        goroutines: number;
        threads: number;
        cpu_seconds_total: number;
        open_fds: number;
        max_fds: number;
        resident_mem_bytes: number;
        virtual_mem_bytes: number;
        start_time_seconds: number;
    };
    network: {
        receive_bytes_total: number;
        transmit_bytes_total: number;
    };
    memory: {
        heap_alloc_bytes: number;
        heap_sys_bytes: number;
        heap_idle_bytes: number;
        heap_inuse_bytes: number;
        heap_objects: number;
        stack_inuse_bytes: number;
        sys_bytes: number;
        alloc_bytes_total: number;
        frees_total: number;
        mallocs_total: number;
    };
    gc: {
        duration_seconds_sum: number;
        duration_seconds_count: number;
        next_gc_bytes: number;
        last_gc_seconds: number;
        gogc_percent: number;
        quantiles?: Record<string, number>;
    };
    runtime: {
        go_version: string;
        gomaxprocs: number;
        mem_limit_bytes: number;
    };
}

export const getCaddyMetrics = () => fetchAPI<CaddyMetrics>('/api/caddy/metrics');

// Caddyfile
export const validateCaddyfile = (caddyfile: string) =>
    fetchAPI<{ valid: boolean; error?: string }>('/api/caddyfile/validate', { method: 'POST', body: JSON.stringify({ caddyfile }) });

// Logs
export interface LogEntry {
    ts: number;
    level: string;
    logger: string;
    msg: string;
    [key: string]: any;
}

export const getLogs = (params?: { lines?: number; search?: string; level?: string; since?: string }) => {
    const query = new URLSearchParams();
    if (params?.lines) query.set('lines', params.lines.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.level) query.set('level', params.level);
    if (params?.since) query.set('since', params.since);
    return fetchAPI<{ logs: LogEntry[] }>(`/api/logs?${query}`);
};

// Logs Stream
export const getLogStream = () => new EventSource(`${API_BASE}/api/logs/stream`);

// DNS Providers
export interface DNSProviderField {
    name: string;
    label: string;
    type: string;
    required: boolean;
    placeholder: string;
}

export interface DNSProviderType {
    id: string;
    name: string;
    module: string;
    fields: DNSProviderField[];
}

export interface DNSProvider {
    id: string;
    name: string;
    provider: string;
    is_default: boolean;
    enabled: boolean;
    created_at: string;
    updated_at: string;
}

export const getDNSProviderTypes = () =>
    fetchAPI<{ types: DNSProviderType[] }>('/api/dns-providers/types');
export const getDNSProviders = () =>
    fetchAPI<{ providers: DNSProvider[] }>('/api/dns-providers');
export const getDNSProvider = (id: string) =>
    fetchAPI<DNSProvider>(`/api/dns-providers/${id}`);
export const createDNSProvider = (data: { name: string; provider: string; credentials: Record<string, string>; is_default?: boolean }) =>
    fetchAPI<DNSProvider>('/api/dns-providers', { method: 'POST', body: JSON.stringify(data) });
export const updateDNSProvider = (id: string, data: Partial<{ name: string; credentials: Record<string, string>; is_default: boolean; enabled: boolean }>) =>
    fetchAPI<DNSProvider>(`/api/dns-providers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteDNSProvider = (id: string) =>
    fetchAPI<{ message: string }>(`/api/dns-providers/${id}`, { method: 'DELETE' });

// File Management
export interface FileInfo {
    name: string;
    path: string;
    type: 'file' | 'directory';
    size: number;
    modified: string;
}

export interface FileListResponse {
    path: string;
    site_path: string;
    files: FileInfo[];
}

export const getFiles = (siteId: string, path: string = '/') =>
    fetchAPI<FileListResponse>(`/api/sites/${siteId}/files?path=${encodeURIComponent(path)}`);

export const uploadFiles = async (siteId: string, files: FileList, path: string = '/', extract: boolean = true) => {
    const formData = new FormData();
    formData.append('path', path);
    formData.append('extract', extract.toString());
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }

    const response = await fetch(`/api/sites/${siteId}/files`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
    }

    return response.json();
};

export const deleteFile = (siteId: string, path: string) =>
    fetchAPI<{ message: string }>(`/api/sites/${siteId}/files?path=${encodeURIComponent(path)}`, { method: 'DELETE' });

export const createDirectory = (siteId: string, path: string) =>
    fetchAPI<{ message: string }>(`/api/sites/${siteId}/files/mkdir`, { method: 'POST', body: JSON.stringify({ path }) });
