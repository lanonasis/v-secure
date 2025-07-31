export declare class VortexCLI {
    private config;
    private api;
    private spinner;
    constructor();
    login(apiUrl?: string): Promise<void>;
    private loginWithOAuth;
    private loginWithToken;
    private loginWithEmail;
    logout(): Promise<void>;
    initProject(projectName?: string, environment?: string): Promise<void>;
    listSecrets(options: any): Promise<void>;
    getSecret(name: string, options: any): Promise<void>;
    setSecret(name: string, value: string | undefined, options: any): Promise<void>;
    deleteSecret(name: string, options: any): Promise<void>;
    rotateSecret(name: string, options: any): Promise<void>;
    private getStoredToken;
    private storeToken;
    private pollForToken;
    private formatStatus;
    private formatDate;
    private generateSecureValue;
    private randomString;
    scheduleRotation(name: string, frequency: string, options: any): Promise<void>;
    showRotations(options: any): Promise<void>;
    showUsage(name: string, options: any): Promise<void>;
    checkHealth(): Promise<void>;
    manageConfig(options: any): Promise<void>;
    exportSecrets(options: any): Promise<void>;
    importSecrets(file: string, options: any): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map