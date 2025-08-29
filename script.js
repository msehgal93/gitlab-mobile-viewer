// GitLab MR Viewer Application
class GitLabMRViewer {
    constructor() {
        this.pat = null;
        this.gitlabUrl = 'https://gitlab.com';
        this.currentMR = null;
        
        this.init();
    }

    init() {
        this.loadSavedData();
        this.bindEvents();
        this.checkInitialState();
    }

    loadSavedData() {
        // Load saved PAT and GitLab URL from localStorage
        this.pat = localStorage.getItem('gitlab_pat');
        const savedUrl = localStorage.getItem('gitlab_url');
        if (savedUrl) {
            this.gitlabUrl = savedUrl;
            document.getElementById('gitlabUrl').value = savedUrl;
        }
    }

    bindEvents() {
        // PAT section events
        document.getElementById('savePatBtn').addEventListener('click', () => this.savePAT());
        document.getElementById('togglePassword').addEventListener('click', () => this.togglePasswordVisibility());
        
        // MR section events
        document.getElementById('viewMrBtn').addEventListener('click', () => this.viewMR());
        document.getElementById('changePatBtn').addEventListener('click', () => this.showPATSection());
        
        // Error section events
        document.getElementById('retryBtn').addEventListener('click', () => this.retryLastAction());
        
        // MR content events
        document.getElementById('openInGitlabBtn').addEventListener('click', () => this.openInGitLab());
        document.getElementById('newMrBtn').addEventListener('click', () => this.showMRInputSection());
        
        // Debug section events
        document.getElementById('testProjectAccessBtn').addEventListener('click', () => this.testCurrentProjectAccess());
        
        // Approval section events
        document.getElementById('approveMrBtn').addEventListener('click', () => this.approveMR());
        document.getElementById('unapproveMrBtn').addEventListener('click', () => this.unapproveMR());
        document.getElementById('mergeMrBtn').addEventListener('click', () => this.mergeMR());
        
        // Changes section events
        document.getElementById('loadChangesBtn').addEventListener('click', () => this.loadMRChanges());
        
        // Comments section events
        document.getElementById('addCommentBtn').addEventListener('click', () => this.addComment());
        
        // Heart animation event
        document.getElementById('heartIcon').addEventListener('click', () => this.animateHeart());
        
        // Enter key support for inputs
        document.getElementById('patInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.savePAT();
        });
        
        document.getElementById('mrUrlInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.viewMR();
        });
    }

    checkInitialState() {
        if (this.pat) {
            // PAT exists, show MR input section
            this.showMRInputSection();
        } else {
            // No PAT, show PAT input section
            this.showPATSection();
        }
    }

    savePAT() {
        const patInput = document.getElementById('patInput');
        const gitlabUrlInput = document.getElementById('gitlabUrl');
        
        const pat = patInput.value.trim();
        const gitlabUrl = gitlabUrlInput.value.trim();
        
        if (!pat) {
            this.showError('Please enter a Personal Access Token');
            return;
        }
        
        if (!gitlabUrl) {
            this.showError('Please enter a GitLab instance URL');
            return;
        }
        
        // Validate PAT format (basic check)
        if (!pat.startsWith('glpat-')) {
            this.showError('Personal Access Token should start with "glpat-"');
            return;
        }
        
        // Save to localStorage
        localStorage.setItem('gitlab_pat', pat);
        localStorage.setItem('gitlab_url', gitlabUrl);
        
        this.pat = pat;
        this.gitlabUrl = gitlabUrl;
        
        // Clear the PAT input for security
        patInput.value = '';
        
        // Show success message and move to MR input
        this.showSuccess('Token saved successfully!');
        setTimeout(() => {
            this.showMRInputSection();
        }, 1000);
    }

    togglePasswordVisibility() {
        const patInput = document.getElementById('patInput');
        const toggleBtn = document.getElementById('togglePassword');
        const icon = toggleBtn.querySelector('i');
        
        if (patInput.type === 'password') {
            patInput.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            patInput.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }

    async viewMR() {
        const mrUrlInput = document.getElementById('mrUrlInput');
        const mrUrl = mrUrlInput.value.trim();
        
        if (!mrUrl) {
            this.showError('Please enter a merge request URL');
            return;
        }
        
        // Parse MR URL to extract project path and MR ID
        const mrInfo = this.parseMRUrl(mrUrl);
        if (!mrInfo) {
            this.showError('Invalid merge request URL. Please use the format: https://gitlab.com/group/project/-/merge_requests/123');
            return;
        }
        
        console.log('Parsed MR info:', mrInfo);
        console.log('GitLab URL:', this.gitlabUrl);
        console.log('PAT (first 10 chars):', this.pat ? this.pat.substring(0, 10) + '...' : 'None');
        
        // Update debug info with parsed MR details
        this.updateDebugInfoWithMR(mrInfo);
        
        this.showLoading();
        
        try {
            // First test if we can access the project
            console.log('🔍 Testing project access before fetching MR...');
            const hasAccess = await this.testProjectAccess(mrInfo.projectPath);
            
            if (!hasAccess) {
                throw new Error(`Cannot access project "${mrInfo.projectPath}". Please check your Personal Access Token permissions.`);
            }
            
            // Now fetch the MR data
            const mrData = await this.fetchMRData(mrInfo.projectPath, mrInfo.mrId);
            this.displayMR(mrData, mrUrl);
        } catch (error) {
            console.error('Error fetching MR:', error);
            this.showError(`Failed to fetch merge request: ${error.message}`);
        }
    }

    parseMRUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/');
            
            // Find the merge_requests index
            const mrIndex = pathParts.findIndex(part => part === 'merge_requests');
            if (mrIndex === -1) return null;
            
            // GitLab URLs have the format: /group/project/-/merge_requests/ID
            // The "/-" is a separator, so we need to find it and exclude it
            let projectEndIndex = mrIndex;
            
            // Look backwards from merge_requests to find the "/-" separator
            // The project path ends just before the "-" part
            for (let i = mrIndex - 1; i >= 0; i--) {
                if (pathParts[i] === '-') {
                    projectEndIndex = i;
                    break;
                }
            }
            
            // Extract project path (everything before the "/-" separator)
            const projectPath = pathParts.slice(1, projectEndIndex).join('/');
            
            // Extract MR ID (after merge_requests)
            const mrId = pathParts[mrIndex + 1];
            
            if (!projectPath || !mrId) return null;
            
            // Handle special cases for GitLab URLs
            console.log('Parsed URL:', { 
                projectPath, 
                mrId, 
                pathParts,
                projectEndIndex,
                separatorFound: pathParts[projectEndIndex] === '-'
            });
            
            // For complex nested group structures like chegginc/security/safe/iac/iac-sonic-workbench-service
            // GitLab API expects the full path encoded properly
            console.log('Full project path:', projectPath);
            console.log('Path segments:', pathParts.slice(1, projectEndIndex));
            
            return { projectPath, mrId };
        } catch (error) {
            console.error('Error parsing URL:', error);
            return null;
        }
    }

    async fetchMRData(projectPath, mrId) {
        // Try different ways to encode the project path for complex nested structures
        const encodedPaths = [
            // Standard encoding (recommended for most cases)
            encodeURIComponent(projectPath),
            // Double encoding for very complex paths
            encodeURIComponent(encodeURIComponent(projectPath)),
            // Manual slash replacement
            projectPath.replace(/\//g, '%2F'),
            // Try with different separators
            projectPath.replace(/\//g, '%252F')
        ];
        
        let lastError = null;
        let attemptCount = 0;
        
        for (const encodedPath of encodedPaths) {
            attemptCount++;
            const apiUrl = `${this.gitlabUrl}/api/v4/projects/${encodedPath}/merge_requests/${mrId}`;
            console.log(`Attempt ${attemptCount}: Trying API URL:`, apiUrl);
            
            try {
                const response = await fetch(apiUrl, {
                    headers: {
                        'PRIVATE-TOKEN': this.pat,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    console.log(`✅ Success on attempt ${attemptCount} with encoding:`, encodedPath);
                    return await response.json();
                }
                
                if (response.status === 401) {
                    throw new Error('Unauthorized. Please check your Personal Access Token.');
                } else if (response.status === 404) {
                    // Try to get more details about the 404 error
                    try {
                        const errorData = await response.json();
                        console.log(`404 Error details:`, errorData);
                        
                        if (errorData.message && errorData.message.includes('Project Not Found')) {
                            lastError = new Error(`Project not found: "${projectPath}". Please check the project path in your URL.`);
                        } else if (errorData.message && errorData.message.includes('Merge Request Not Found')) {
                            lastError = new Error(`Merge request ${mrId} not found in project "${projectPath}".`);
                        } else {
                            lastError = new Error(`Project not found or merge request ${mrId} doesn't exist.`);
                        }
                    } catch (parseError) {
                        lastError = new Error(`Project not found: "${projectPath}". Please check the project path in your URL.`);
                    }
                } else {
                    lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            } catch (fetchError) {
                console.log(`Fetch error on attempt ${attemptCount}:`, fetchError);
                lastError = fetchError;
            }
        }
        
        // Provide more helpful error message for complex project paths
        if (projectPath.includes('/')) {
            throw new Error(`Failed to fetch merge request. The project path "${projectPath}" contains multiple levels. Please ensure your Personal Access Token has access to this project and the path is correct.`);
        }
        
        throw lastError || new Error('Failed to fetch merge request data');
    }

    displayMR(mrData, originalUrl) {
        this.currentMR = mrData;
        
        // Update MR header
        document.getElementById('mrTitle').textContent = mrData.title;
        document.getElementById('mrNumber').textContent = `#${mrData.iid}`;
        
        // Update status
        const statusElement = document.getElementById('mrStatus');
        statusElement.textContent = mrData.state;
        statusElement.className = `mr-status ${mrData.state}`;
        
        // Update MR info
        document.getElementById('mrAuthor').textContent = mrData.author?.name || 'Unknown';
        document.getElementById('mrCreated').textContent = this.formatDate(mrData.created_at);
        document.getElementById('mrUpdated').textContent = this.formatDate(mrData.updated_at);
        document.getElementById('mrSourceBranch').textContent = mrData.source_branch;
        document.getElementById('mrTargetBranch').textContent = mrData.target_branch;
        
        // Update description
        const descriptionElement = document.getElementById('mrDescription');
        if (mrData.description) {
            descriptionElement.innerHTML = this.formatDescription(mrData.description);
        } else {
            descriptionElement.innerHTML = '<p><em>No description provided</em></p>';
        }
        
        // Update open in GitLab button
        const openButton = document.getElementById('openInGitlabBtn');
        openButton.onclick = () => window.open(originalUrl, '_blank');
        
        // Load additional MR data
        this.loadCurrentUser();
        this.loadApprovalStatus();
        this.loadMRComments();
        
        // Show MR content
        this.showSection('mrContent');
        
        // Add debug info in console
        console.log('Successfully displayed MR:', {
            title: mrData.title,
            projectPath: this.currentMR?.web_url ? this.parseMRUrl(this.currentMR.web_url)?.projectPath : 'Unknown',
            mrId: mrData.iid
        });
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    }

    formatDescription(description) {
        if (!description) return '';
        
        // Convert markdown-like formatting to HTML
        return description
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '</p><p>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>')
            .replace(/<p><\/p>/g, '');
    }

    showPATSection() {
        this.showSection('patSection');
        document.getElementById('patInput').focus();
    }

    showMRInputSection() {
        this.showSection('mrSection');
        document.getElementById('mrUrlInput').focus();
        
        // Update debug info
        this.updateDebugInfo();
    }

    showLoading() {
        this.showSection('loadingSection');
    }

    showSection(sectionId) {
        // Hide all sections
        const sections = ['patSection', 'mrSection', 'loadingSection', 'mrContent', 'errorSection'];
        sections.forEach(id => {
            document.getElementById(id).style.display = 'none';
        });
        
        // Show the requested section
        document.getElementById(sectionId).style.display = 'block';
    }

    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        this.showSection('errorSection');
    }

    showSuccess(message) {
        // Create a temporary success message
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `
            <div class="card" style="background: #d4edda; border-color: #c3e6cb; color: #155724;">
                <h2><i class="fas fa-check-circle"></i> Success</h2>
                <p>${message}</p>
            </div>
        `;
        
        // Insert after header
        const header = document.querySelector('.header');
        header.parentNode.insertBefore(successDiv, header.nextSibling);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }

    retryLastAction() {
        if (this.currentMR) {
            // Retry viewing the last MR
            this.showMRInputSection();
            document.getElementById('mrUrlInput').value = this.currentMR.web_url || '';
        } else {
            // Go back to MR input
            this.showMRInputSection();
        }
    }

    openInGitLab() {
        if (this.currentMR && this.currentMR.web_url) {
            window.open(this.currentMR.web_url, '_blank');
        }
    }

    newMR() {
        this.showMRInputSection();
        document.getElementById('mrUrlInput').value = '';
        document.getElementById('mrUrlInput').focus();
    }
    
    updateDebugInfo() {
        const debugElements = {
            gitlabUrl: this.gitlabUrl,
            patStatus: this.pat ? '✅ Set' : '❌ Not Set',
            projectPath: '-',
            mrId: '-'
        };
        
        // Update debug display
        Object.keys(debugElements).forEach(key => {
            const element = document.getElementById(`debug${key.charAt(0).toUpperCase() + key.slice(1)}`);
            if (element) {
                element.textContent = debugElements[key];
            }
        });
    }
    
    // Helper function to test project access
    async testProjectAccess(projectPath) {
        const testUrl = `${this.gitlabUrl}/api/v4/projects/${encodeURIComponent(projectPath)}`;
        console.log('Testing project access:', testUrl);
        
        try {
            const response = await fetch(testUrl, {
                headers: {
                    'PRIVATE-TOKEN': this.pat,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const projectData = await response.json();
                console.log('✅ Project access confirmed:', {
                    name: projectData.name,
                    path: projectData.path,
                    visibility: projectData.visibility
                });
                return true;
            } else {
                console.log('❌ Project access failed:', response.status, response.statusText);
                return false;
            }
        } catch (error) {
            console.error('Error testing project access:', error);
            return false;
        }
    }
    
    // Load current user information
    async loadCurrentUser() {
        try {
            const apiUrl = `${this.gitlabUrl}/api/v4/user`;
            
            const response = await fetch(apiUrl, {
                headers: {
                    'PRIVATE-TOKEN': this.pat,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                this.currentUser = await response.json();
                console.log('Current user loaded:', {
                    id: this.currentUser.id,
                    username: this.currentUser.username,
                    name: this.currentUser.name,
                    email: this.currentUser.email
                });
            } else {
                console.log('Could not load current user:', response.status);
            }
        } catch (error) {
            console.error('Error loading current user:', error);
        }
    }
    
    // Load MR approval status
    async loadApprovalStatus() {
        if (!this.currentMR) return;
        
        try {
            const projectId = this.currentMR.project_id;
            const apiUrl = `${this.gitlabUrl}/api/v4/projects/${projectId}/merge_requests/${this.currentMR.iid}/approvals`;
            
            const response = await fetch(apiUrl, {
                headers: {
                    'PRIVATE-TOKEN': this.pat,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const approvalData = await response.json();
                this.displayApprovalStatus(approvalData);
            } else {
                console.log('Could not load approval status:', response.status);
                document.getElementById('approvalText').textContent = 'Approval status not available';
                // Still show merge button even if approval status fails
                this.showMergeButton();
            }
        } catch (error) {
            console.error('Error loading approval status:', error);
            document.getElementById('approvalText').textContent = 'Error loading approval status';
            // Still show merge button even if approval status fails
            this.showMergeButton();
        }
    }
    
    // Show merge button with appropriate state
    showMergeButton() {
        const mergeBtn = document.getElementById('mergeMrBtn');
        const approveBtn = document.getElementById('approveMrBtn');
        const unapproveBtn = document.getElementById('unapproveMrBtn');
        const mrState = this.currentMR?.state || 'opened';
        
        const isMergedOrClosed = mrState === 'merged' || mrState === 'closed';
        
        if (isMergedOrClosed) {
            // Disable all buttons when merged or closed
            approveBtn.disabled = true;
            approveBtn.className = 'btn btn-secondary';
            approveBtn.style.display = 'none';
            
            unapproveBtn.disabled = true;
            unapproveBtn.className = 'btn btn-secondary';
            unapproveBtn.style.display = 'none';
            
            if (mrState === 'merged') {
                mergeBtn.innerHTML = '<i class="fas fa-check"></i> Already Merged';
            } else {
                mergeBtn.innerHTML = '<i class="fas fa-times"></i> MR Closed';
            }
            mergeBtn.disabled = true;
            mergeBtn.className = 'btn btn-secondary';
        } else {
            mergeBtn.innerHTML = '<i class="fas fa-code-branch"></i> Merge MR';
            mergeBtn.disabled = false;
            mergeBtn.className = 'btn btn-primary';
        }
    }
    
    // Display approval status
    displayApprovalStatus(approvalData) {
        const approvalText = document.getElementById('approvalText');
        const approveBtn = document.getElementById('approveMrBtn');
        const unapproveBtn = document.getElementById('unapproveMrBtn');
        const mergeBtn = document.getElementById('mergeMrBtn');
        
        const approvedBy = approvalData.approved_by || [];
        const approvalsRequired = approvalData.approvals_required || 0;
        const mrState = this.currentMR?.state || 'opened';
        
        // If MR is merged or closed, disable ALL buttons
        const isMergedOrClosed = mrState === 'merged' || mrState === 'closed';
        
        if (isMergedOrClosed) {
            // Disable all approval buttons when MR is merged/closed
            approveBtn.disabled = true;
            approveBtn.className = 'btn btn-secondary';
            unapproveBtn.disabled = true;
            unapproveBtn.className = 'btn btn-secondary';
            
            if (mrState === 'merged') {
                mergeBtn.innerHTML = '<i class="fas fa-check"></i> Already Merged';
                approvalText.innerHTML = `✅ <strong>Merge request is merged</strong>`;
            } else {
                mergeBtn.innerHTML = '<i class="fas fa-times"></i> MR Closed';
                approvalText.innerHTML = `❌ <strong>Merge request is closed</strong>`;
            }
            mergeBtn.disabled = true;
            mergeBtn.className = 'btn btn-secondary';
            
            // Hide both approval buttons when merged/closed
            approveBtn.style.display = 'none';
            unapproveBtn.style.display = 'none';
            return;
        }
        
        // Normal flow for open MRs
        mergeBtn.innerHTML = '<i class="fas fa-code-branch"></i> Merge MR';
        mergeBtn.disabled = false;
        mergeBtn.className = 'btn btn-primary';
        
        // Reset button states
        approveBtn.disabled = false;
        approveBtn.className = 'btn btn-success';
        unapproveBtn.disabled = false;
        unapproveBtn.className = 'btn btn-warning';
        
        if (approvedBy.length > 0) {
            const approvers = approvedBy.map(a => a.user.name).join(', ');
            approvalText.innerHTML = `✅ <strong>Approved by:</strong> ${approvers}`;
            
            // Check if current user approved it
            const currentUserApproval = approvedBy.find(approval => {
                // Try to match by various user identifiers
                return approval.user.username === this.currentUser?.username ||
                       approval.user.id === this.currentUser?.id ||
                       approval.user.email === this.currentUser?.email;
            });
            
            if (currentUserApproval) {
                // User can unapprove their own approval
                approveBtn.style.display = 'none';
                unapproveBtn.style.display = 'inline-flex';
                unapproveBtn.innerHTML = '<i class="fas fa-thumbs-down"></i> Unapprove';
            } else {
                // Someone else approved - user can still approve (multiple approvals) but cannot unapprove others
                approveBtn.style.display = 'inline-flex';
                unapproveBtn.style.display = 'inline-flex';
                unapproveBtn.disabled = true;
                unapproveBtn.className = 'btn btn-secondary';
                unapproveBtn.innerHTML = '<i class="fas fa-lock"></i> Cannot Unapprove Others';
            }
        } else if (approvalsRequired > 0) {
            approvalText.innerHTML = `⏳ <strong>Requires ${approvalsRequired} approval(s)</strong>`;
            approveBtn.style.display = 'inline-flex';
            unapproveBtn.style.display = 'none';
        } else {
            approvalText.innerHTML = `ℹ️ <strong>No approvals required</strong>`;
            approveBtn.style.display = 'inline-flex';
            unapproveBtn.style.display = 'none';
        }
    }
    
    // Approve MR
    async approveMR() {
        if (!this.currentMR) return;
        
        try {
            const projectId = this.currentMR.project_id;
            const apiUrl = `${this.gitlabUrl}/api/v4/projects/${projectId}/merge_requests/${this.currentMR.iid}/approve`;
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'PRIVATE-TOKEN': this.pat,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                this.showSuccess('Merge request approved successfully!');
                this.loadApprovalStatus(); // Reload approval status
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to approve merge request');
            }
        } catch (error) {
            console.error('Error approving MR:', error);
            this.showError(`Failed to approve merge request: ${error.message}`);
        }
    }
    
    // Unapprove MR
    async unapproveMR() {
        if (!this.currentMR) return;
        
        // Check if user can unapprove (only their own approval)
        if (!this.currentUser) {
            this.showError('Cannot determine current user. Please refresh and try again.');
            return;
        }
        
        try {
            const projectId = this.currentMR.project_id;
            const apiUrl = `${this.gitlabUrl}/api/v4/projects/${projectId}/merge_requests/${this.currentMR.iid}/unapprove`;
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'PRIVATE-TOKEN': this.pat,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                this.showSuccess('Merge request unapproved successfully!');
                this.loadApprovalStatus(); // Reload approval status
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to unapprove merge request');
            }
        } catch (error) {
            console.error('Error unapproving MR:', error);
            this.showError(`Failed to unapprove merge request: ${error.message}`);
        }
    }
    
    // Check if MR can be merged
    async checkMergeStatus() {
        if (!this.currentMR) {
            return { canMerge: false, reason: 'No merge request loaded' };
        }
        
        try {
            const projectId = this.currentMR.project_id;
            const apiUrl = `${this.gitlabUrl}/api/v4/projects/${projectId}/merge_requests/${this.currentMR.iid}`;
            
            console.log('Checking merge status at:', apiUrl);
            
            const response = await fetch(apiUrl, {
                headers: {
                    'PRIVATE-TOKEN': this.pat,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const mrData = await response.json();
                console.log('MR status data:', {
                    merge_status: mrData.merge_status,
                    pipeline_status: mrData.pipeline?.status,
                    has_conflicts: mrData.has_conflicts,
                    work_in_progress: mrData.work_in_progress,
                    state: mrData.state
                });
                
                // Check various conditions that might prevent merging
                if (mrData.merge_status === 'cannot_be_merged') {
                    return { canMerge: false, reason: 'Merge conflicts detected' };
                }
                
                if (mrData.has_conflicts) {
                    return { canMerge: false, reason: 'Merge conflicts must be resolved' };
                }
                
                if (mrData.work_in_progress) {
                    return { canMerge: false, reason: 'Remove WIP status first' };
                }
                
                if (mrData.pipeline && mrData.pipeline.status === 'failed') {
                    return { canMerge: false, reason: 'Pipeline failed' };
                }
                
                if (mrData.pipeline && mrData.pipeline.status === 'running') {
                    return { canMerge: false, reason: 'Pipeline is still running' };
                }
                
                // If merge_status is available and indicates mergeable
                if (mrData.merge_status === 'can_be_merged') {
                    return { canMerge: true, reason: 'Ready to merge' };
                }
                
                // Default to allowing merge if no blocking conditions found
                return { canMerge: true, reason: 'Ready to merge' };
            } else {
                console.log('Could not check merge status:', response.status);
                // If we can't check status, allow the merge attempt
                return { canMerge: true, reason: 'Status check failed, attempting merge' };
            }
        } catch (error) {
            console.error('Error checking merge status:', error);
            // If there's an error checking, allow the merge attempt
            return { canMerge: true, reason: 'Status check failed, attempting merge' };
        }
    }
    
    // Merge MR
    async mergeMR() {
        if (!this.currentMR) return;
        
        // Check if MR is in a mergeable state
        if (this.currentMR.state === 'merged') {
            this.showError('This merge request is already merged.');
            return;
        }
        
        if (this.currentMR.state === 'closed') {
            this.showError('This merge request is closed and cannot be merged.');
            return;
        }
        
        // Check merge status first
        console.log('Checking merge status before attempting merge...');
        const mergeStatus = await this.checkMergeStatus();
        if (!mergeStatus.canMerge) {
            this.showError(`Cannot merge: ${mergeStatus.reason}`);
            return;
        }
        
        // Show confirmation dialog
        const confirmed = confirm(
            `Are you sure you want to merge "${this.currentMR.title}"?\n\n` +
            `This will merge ${this.currentMR.source_branch} into ${this.currentMR.target_branch}.`
        );
        
        if (!confirmed) return;
        
        const mergeBtn = document.getElementById('mergeMrBtn');
        const originalText = mergeBtn.innerHTML;
        mergeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Merging...';
        mergeBtn.disabled = true;
        
        try {
            // Get project ID from current MR data - this is the numeric ID GitLab uses
            const projectId = this.currentMR.project_id;
            
            if (!projectId) {
                throw new Error('Project ID not found in MR data');
            }
            
            // Use the exact curl command format with numeric project ID
            const apiUrl = `${this.gitlabUrl}/api/v4/projects/${projectId}/merge_requests/${this.currentMR.iid}/merge`;
            
            console.log('Attempting merge with exact curl format to:', apiUrl);
            
            // First try: Exact curl command - PUT with no body
            let response = await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'PRIVATE-TOKEN': this.pat
                }
                // No body, no Content-Type - exact curl equivalent
            });
            
            // If that fails with 405, try with minimal merge options
            if (response.status === 405) {
                console.log('PUT with no body failed, trying with minimal options...');
                response = await fetch(apiUrl, {
                    method: 'PUT',
                    headers: {
                        'PRIVATE-TOKEN': this.pat,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({})
                });
            }
            
            // If still failing with 405, try POST as last resort
            if (response.status === 405) {
                console.log('PUT methods failed, trying POST...');
                response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'PRIVATE-TOKEN': this.pat
                    }
                });
            }
            
            if (response.ok) {
                const mergeResult = await response.json();
                this.showSuccess('🎉 Merge request merged successfully!');
                
                // Update the current MR data
                this.currentMR = mergeResult;
                
                // Refresh the approval status to show merged state
                this.loadApprovalStatus();
                
                // Update the MR status display
                const statusElement = document.getElementById('mrStatus');
                statusElement.textContent = 'merged';
                statusElement.className = 'mr-status merged';
                
                console.log('MR merged successfully:', mergeResult);
            } else {
                const errorData = await response.json();
                
                // Handle specific merge errors
                if (response.status === 405) {
                    throw new Error('Merge operation not allowed. This GitLab instance may have merge restrictions or the endpoint is disabled.');
                } else if (response.status === 401) {
                    throw new Error('Unauthorized. Your token may not have merge permissions.');
                } else if (response.status === 403) {
                    throw new Error('Forbidden. You may not have permission to merge this MR.');
                } else if (response.status === 406) {
                    throw new Error('Cannot merge due to conflicts or failed checks.');
                } else if (errorData.message) {
                    if (errorData.message.includes('pipeline')) {
                        throw new Error('Cannot merge: Pipeline must succeed first.');
                    } else if (errorData.message.includes('approval')) {
                        throw new Error('Cannot merge: Required approvals missing.');
                    } else if (errorData.message.includes('conflict')) {
                        throw new Error('Cannot merge: Merge conflicts must be resolved.');
                    } else {
                        throw new Error(errorData.message);
                    }
                } else {
                    throw new Error(`Failed to merge merge request (HTTP ${response.status})`);
                }
            }
        } catch (error) {
            console.error('Error merging MR:', error);
            this.showError(`Failed to merge: ${error.message}`);
            
            // Restore button state
            mergeBtn.innerHTML = originalText;
            mergeBtn.disabled = false;
        }
    }
    
    // Load MR changes/diffs
    async loadMRChanges() {
        if (!this.currentMR) return;
        
        const loadBtn = document.getElementById('loadChangesBtn');
        const originalText = loadBtn.innerHTML;
        loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        loadBtn.disabled = true;
        
        try {
            const projectId = this.currentMR.project_id;
            const apiUrl = `${this.gitlabUrl}/api/v4/projects/${projectId}/merge_requests/${this.currentMR.iid}/changes`;
            
            const response = await fetch(apiUrl, {
                headers: {
                    'PRIVATE-TOKEN': this.pat,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const changesData = await response.json();
                this.displayMRChanges(changesData);
            } else {
                throw new Error('Failed to load changes');
            }
        } catch (error) {
            console.error('Error loading MR changes:', error);
            this.showError(`Failed to load changes: ${error.message}`);
        } finally {
            loadBtn.innerHTML = originalText;
            loadBtn.disabled = false;
        }
    }
    
    // Display MR changes
    displayMRChanges(changesData) {
        const summaryEl = document.getElementById('changesSummary');
        const contentEl = document.getElementById('changesContent');
        
        const changes = changesData.changes || [];
        const stats = {
            filesChanged: changes.length,
            additions: 0,
            deletions: 0
        };
        
        // Calculate stats
        changes.forEach(change => {
            if (change.diff) {
                const lines = change.diff.split('\n');
                lines.forEach(line => {
                    if (line.startsWith('+') && !line.startsWith('+++')) stats.additions++;
                    if (line.startsWith('-') && !line.startsWith('---')) stats.deletions++;
                });
            }
        });
        
        // Display summary
        summaryEl.innerHTML = `
            <strong>Changes Summary:</strong> 
            ${stats.filesChanged} file(s) changed, 
            <span style="color: #28a745;">+${stats.additions} additions</span>, 
            <span style="color: #dc3545;">-${stats.deletions} deletions</span>
        `;
        
        // Display file diffs
        contentEl.innerHTML = '';
        changes.forEach(change => {
            const fileDiv = document.createElement('div');
            fileDiv.className = 'file-diff';
            
            const header = document.createElement('div');
            header.className = 'file-header';
            header.textContent = change.new_path || change.old_path;
            
            const diffContent = document.createElement('div');
            diffContent.className = 'diff-content';
            
            if (change.diff) {
                const lines = change.diff.split('\n');
                lines.forEach((line, index) => {
                    const lineDiv = document.createElement('div');
                    lineDiv.className = 'diff-line';
                    
                    if (line.startsWith('+') && !line.startsWith('+++')) {
                        lineDiv.classList.add('added');
                        lineDiv.innerHTML = `<span class="diff-line-number">${index + 1}</span>${this.escapeHtml(line)}`;
                    } else if (line.startsWith('-') && !line.startsWith('---')) {
                        lineDiv.classList.add('removed');
                        lineDiv.innerHTML = `<span class="diff-line-number">${index + 1}</span>${this.escapeHtml(line)}`;
                    } else if (!line.startsWith('@@') && !line.startsWith('+++') && !line.startsWith('---')) {
                        lineDiv.classList.add('context');
                        lineDiv.innerHTML = `<span class="diff-line-number">${index + 1}</span>${this.escapeHtml(line)}`;
                    } else {
                        lineDiv.innerHTML = `<span class="diff-line-number"></span>${this.escapeHtml(line)}`;
                        lineDiv.style.fontWeight = 'bold';
                        lineDiv.style.color = '#666';
                    }
                    
                    diffContent.appendChild(lineDiv);
                });
            } else {
                diffContent.innerHTML = '<em>Binary file or no changes to display</em>';
            }
            
            fileDiv.appendChild(header);
            fileDiv.appendChild(diffContent);
            contentEl.appendChild(fileDiv);
        });
    }
    
    // Load MR comments
    async loadMRComments() {
        if (!this.currentMR) return;
        
        try {
            const projectId = this.currentMR.project_id;
            const apiUrl = `${this.gitlabUrl}/api/v4/projects/${projectId}/merge_requests/${this.currentMR.iid}/notes`;
            
            const response = await fetch(apiUrl, {
                headers: {
                    'PRIVATE-TOKEN': this.pat,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const comments = await response.json();
                this.displayMRComments(comments);
            } else {
                console.log('Could not load comments:', response.status);
            }
        } catch (error) {
            console.error('Error loading comments:', error);
        }
    }
    
    // Display MR comments
    displayMRComments(comments) {
        const commentsList = document.getElementById('commentsList');
        commentsList.innerHTML = '';
        
        if (comments.length === 0) {
            commentsList.innerHTML = '<p style="color: #666; font-style: italic;">No comments yet.</p>';
            return;
        }
        
        comments.forEach(comment => {
            if (comment.system) return; // Skip system notes
            
            const commentDiv = document.createElement('div');
            commentDiv.className = 'comment-item';
            
            commentDiv.innerHTML = `
                <div class="comment-header">
                    <span class="comment-author">${comment.author.name}</span>
                    <span class="comment-date">${this.formatDate(comment.created_at)}</span>
                </div>
                <div class="comment-body">${this.formatDescription(comment.body)}</div>
            `;
            
            commentsList.appendChild(commentDiv);
        });
    }
    
    // Add a new comment
    async addComment() {
        const commentText = document.getElementById('newCommentText').value.trim();
        
        if (!commentText) {
            this.showError('Please enter a comment');
            return;
        }
        
        if (!this.currentMR) return;
        
        const addBtn = document.getElementById('addCommentBtn');
        const originalText = addBtn.innerHTML;
        addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        addBtn.disabled = true;
        
        try {
            const projectId = this.currentMR.project_id;
            const apiUrl = `${this.gitlabUrl}/api/v4/projects/${projectId}/merge_requests/${this.currentMR.iid}/notes`;
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'PRIVATE-TOKEN': this.pat,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    body: commentText
                })
            });
            
            if (response.ok) {
                document.getElementById('newCommentText').value = '';
                this.showSuccess('Comment added successfully!');
                this.loadMRComments(); // Reload comments
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add comment');
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            this.showError(`Failed to add comment: ${error.message}`);
        } finally {
            addBtn.innerHTML = originalText;
            addBtn.disabled = false;
        }
    }
    
    // Utility function to escape HTML
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
    
    // Test access to the currently parsed project
    async testCurrentProjectAccess() {
        const projectPath = document.getElementById('debugProjectPath').textContent;
        
        if (projectPath === '-' || !projectPath) {
            alert('Please enter a merge request URL first to test project access.');
            return;
        }
        
        if (!this.pat) {
            alert('Please set your Personal Access Token first.');
            return;
        }
        
        console.log('🧪 Testing access to project:', projectPath);
        
        try {
            const hasAccess = await this.testProjectAccess(projectPath);
            if (hasAccess) {
                alert(`✅ Success! You have access to project "${projectPath}"`);
            } else {
                alert(`❌ Access denied to project "${projectPath}". Please check your PAT permissions.`);
            }
        } catch (error) {
            alert(`Error testing project access: ${error.message}`);
        }
    }
    
    updateDebugInfoWithMR(mrInfo) {
        if (mrInfo) {
            const projectElement = document.getElementById('debugProjectPath');
            const mrIdElement = document.getElementById('debugMrId');
            
            if (projectElement) projectElement.textContent = mrInfo.projectPath;
            if (mrIdElement) mrIdElement.textContent = mrInfo.mrId;
        }
    }
    
    // Animate heart with floating hearts and show love message
    animateHeart() {
        const heart = document.getElementById('heartIcon');
        const loveMessage = document.getElementById('loveMessage');
        const heartContainer = heart.parentElement;
        
        // Add animation class to heart
        heart.classList.add('animate');
        
        // Show love message
        loveMessage.classList.add('show');
        
        // Create floating hearts
        this.createFloatingHearts(heartContainer);
        
        // Remove animation class after animation completes
        setTimeout(() => {
            heart.classList.remove('animate');
        }, 800);
        
        // Hide love message after 3 seconds
        setTimeout(() => {
            loveMessage.classList.remove('show');
        }, 3000);
    }
    
    // Create floating hearts animation
    createFloatingHearts(container) {
        const hearts = ['💕', '💖', '💗', '💝', '💘'];
        const heartCount = 5;
        
        for (let i = 0; i < heartCount; i++) {
            setTimeout(() => {
                const floatingHeart = document.createElement('span');
                floatingHeart.className = 'floating-heart';
                floatingHeart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
                
                // Random position around the heart
                const angle = (Math.PI * 2 * i) / heartCount;
                const radius = 30;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                
                floatingHeart.style.left = `${x}px`;
                floatingHeart.style.top = `${y}px`;
                
                container.appendChild(floatingHeart);
                
                // Remove the floating heart after animation
                setTimeout(() => {
                    if (floatingHeart.parentElement) {
                        floatingHeart.parentElement.removeChild(floatingHeart);
                    }
                }, 2000);
            }, i * 100); // Stagger the hearts
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const viewer = new GitLabMRViewer();
    // Store reference for debugging
    document.querySelector('.container').__gitlabViewer = viewer;
    window.gitlabViewer = viewer;
});

// Add some utility functions
window.clearGitLabData = function() {
    localStorage.removeItem('gitlab_pat');
    localStorage.removeItem('gitlab_url');
    location.reload();
};

// Test URL parsing function
window.testUrlParsing = function(url) {
    const viewer = new GitLabMRViewer();
    const result = viewer.parseMRUrl(url || 'https://gitlab.com/chegginc/security/safe/iac/iac-sonic-workbench-service/-/merge_requests/10');
    console.log('URL parsing test result:', result);
    return result;
};

// Debug merge status function
window.debugMergeStatus = async function() {
    const viewer = document.querySelector('.container')?.__gitlabViewer;
    if (!viewer || !viewer.currentMR) {
        console.log('No MR loaded. Please load an MR first.');
        return;
    }
    
    console.log('=== MR Merge Debug Information ===');
    console.log('Current MR state:', viewer.currentMR.state);
    console.log('Current MR ID:', viewer.currentMR.iid);
    console.log('Source branch:', viewer.currentMR.source_branch);
    console.log('Target branch:', viewer.currentMR.target_branch);
    
    // Show exact curl command format
    const projectId = viewer.currentMR.project_id;
    const projectPath = viewer.parseMRUrl(viewer.currentMR.web_url)?.projectPath;
    const curlUrl = `${viewer.gitlabUrl}/api/v4/projects/${projectId}/merge_requests/${viewer.currentMR.iid}/merge`;
    
    console.log('=== Curl Command Equivalent ===');
    console.log('Project ID (numeric):', projectId);
    console.log('Project Path (text):', projectPath);
    console.log('Merge URL:', curlUrl);
    console.log('Full curl command:');
    console.log(`curl --request PUT "${curlUrl}" --header "PRIVATE-TOKEN: ${viewer.pat?.substring(0, 10)}..."`);
    
    const mergeStatus = await viewer.checkMergeStatus();
    console.log('Merge status check result:', mergeStatus);
    
    return mergeStatus;
};

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K to focus PAT input
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const patInput = document.getElementById('patInput');
        if (patInput.style.display !== 'none') {
            patInput.focus();
        }
    }
    
    // Ctrl/Cmd + L to focus MR URL input
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        const mrInput = document.getElementById('mrUrlInput');
        if (mrInput.style.display !== 'none') {
            mrInput.focus();
        }
    }
    
    // Escape to go back
    if (e.key === 'Escape') {
        const viewer = window.gitlabViewer;
        if (viewer && viewer.currentMR) {
            viewer.showMRInputSection();
        }
    }
});
