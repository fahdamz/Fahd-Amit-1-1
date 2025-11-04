// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    
    class TaskManager {
        constructor() {
            this.data = JSON.parse(localStorage.getItem('fahdAmitData')) || {
                tasks: [],
                initiatives: [],
                archivedWeeks: {}
            };
            this.currentTaskId = null;
            this.currentInitiativeId = null;
            this.currentWeek = null;
            this.init();
        }

        init() {
            this.setWeekNumber();
            this.bindEvents();
            this.render();
        }

        setWeekNumber() {
            const now = new Date();
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            const pastDaysOfYear = (now - startOfYear) / 86400000;
            const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
            
            // Calculate Monday of current week
            const dayOfWeek = now.getDay();
            const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const monday = new Date(now);
            monday.setDate(now.getDate() + daysToMonday);
            
            const mondayMonth = monday.getMonth() + 1;
            const mondayDay = monday.getDate();
            const weekDateText = `(${mondayMonth}/${mondayDay})`;
            
            this.currentWeek = weekNumber;
            document.getElementById('weekNumber').textContent = weekNumber;
            document.getElementById('weekDate').textContent = weekDateText;
        }

        bindEvents() {
            // Tab switching
            document.querySelector('[data-tab="tasks"]').addEventListener('click', () => this.showTab('tasks'));
            document.querySelector('[data-tab="initiatives"]').addEventListener('click', () => this.showTab('initiatives'));
            document.querySelector('[data-tab="archives"]').addEventListener('click', () => this.showTab('archives'));

            // Task events
            document.getElementById('addTaskBtn').addEventListener('click', () => this.openTaskModal());
            document.getElementById('saveTask').addEventListener('click', () => this.saveTask());
            document.getElementById('taskName').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.saveTask();
            });

            // Initiative events
            document.getElementById('addInitiativeBtn').addEventListener('click', () => this.openInitiativeModal());
            document.getElementById('saveInitiative').addEventListener('click', () => this.saveInitiative());
            document.getElementById('initiativeName').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.saveInitiative();
            });

            // Detail events
            document.getElementById('saveTaskDetail').addEventListener('click', () => this.saveTaskDetail());
            document.getElementById('saveInitiativeDetail').addEventListener('click', () => this.saveInitiativeDetail());

            // File events
            document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileUpload(e));
            document.getElementById('initiativeFileInput').addEventListener('change', (e) => this.handleInitiativeFileUpload(e));

            // Close modals
            document.querySelectorAll('.close').forEach(closeBtn => {
                closeBtn.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal')));
            });

            // Week selector
            document.getElementById('weekSelector').addEventListener('change', (e) => this.loadArchivedWeek(e.target.value));

            // Context menu events
            document.getElementById('deleteItem').addEventListener('click', () => this.handleContextDelete());
            
            // Hide context menu on click elsewhere
            document.addEventListener('click', () => this.hideContextMenu());
            document.addEventListener('contextmenu', (e) => {
                if (!e.target.closest('.task-item') && !e.target.closest('.initiative-item')) {
                    this.hideContextMenu();
                }
            });

            // Modal background click
            window.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal')) {
                    this.closeModal(e.target);
                }
            });
        }

        showTab(tabName) {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
            document.getElementById(`${tabName}Tab`).classList.add('active');
        }

        openTaskModal() {
            document.getElementById('taskModal').style.display = 'block';
            document.getElementById('taskName').focus();
        }

        openInitiativeModal() {
            document.getElementById('initiativeModal').style.display = 'block';
            document.getElementById('initiativeName').focus();
        }

        openTaskDetail(taskId) {
            const task = this.data.tasks.find(t => t.id === taskId);
            if (!task) return;

            document.getElementById('taskDetailTitle').textContent = task.name;
            document.getElementById('taskStatus').value = task.status;
            document.getElementById('taskEditor').innerHTML = task.notes || '';
            
            this.renderFiles(task.files || []);
            this.currentTaskId = taskId;
            document.getElementById('taskDetailModal').style.display = 'block';
        }

        openInitiativeDetail(initiativeId) {
            const initiative = this.data.initiatives.find(i => i.id === initiativeId);
            if (!initiative) return;

            document.getElementById('initiativeDetailTitle').textContent = initiative.name;
            document.getElementById('initiativeStatus').value = initiative.status || 'yellow';
            document.getElementById('initiativeEditor').innerHTML = initiative.content || '';
            
            this.renderInitiativeFiles(initiative.files || []);
            this.currentInitiativeId = initiativeId;
            document.getElementById('initiativeDetailModal').style.display = 'block';
        }

        closeModal(modal) {
            modal.style.display = 'none';
            document.getElementById('taskName').value = '';
            document.getElementById('initiativeName').value = '';
        }

        saveTask() {
            const name = document.getElementById('taskName').value.trim();
            if (!name) return;

            const task = {
                id: Date.now(),
                name,
                status: 'not-started',
                notes: '',
                files: []
            };
            this.data.tasks.push(task);

            this.saveData();
            this.render();
            this.closeModal(document.getElementById('taskModal'));
        }

        saveInitiative() {
            const name = document.getElementById('initiativeName').value.trim();
            if (!name) return;

            const initiative = {
                id: Date.now(),
                name,
                status: 'yellow',
                content: '',
                files: []
            };
            this.data.initiatives.push(initiative);

            this.saveData();
            this.render();
            this.closeModal(document.getElementById('initiativeModal'));
        }

        saveTaskDetail() {
            const task = this.data.tasks.find(t => t.id === this.currentTaskId);
            if (!task) return;

            task.status = document.getElementById('taskStatus').value;
            task.notes = document.getElementById('taskEditor').innerHTML;

            this.saveData();
            this.render();
            this.closeModal(document.getElementById('taskDetailModal'));
        }

        saveInitiativeDetail() {
            const initiative = this.data.initiatives.find(i => i.id === this.currentInitiativeId);
            if (!initiative) return;

            initiative.status = document.getElementById('initiativeStatus').value;
            initiative.content = document.getElementById('initiativeEditor').innerHTML;

            this.saveData();
            this.render();
            this.closeModal(document.getElementById('initiativeDetailModal'));
        }

        insertTable() {
            const tableHtml = `
                <div class="table-wrapper">
                    <table>
                        <tr><th>Header 1</th><th>Header 2</th></tr>
                        <tr><td>Cell 1</td><td>Cell 2</td></tr>
                    </table>
                    <button class="add-row-btn" onclick="window.taskManager.addTableRow(this)">+</button>
                    <button class="add-col-btn" onclick="window.taskManager.addTableColumn(this)">+</button>
                </div><p><br></p>
            `;
            document.getElementById('initiativeEditor').focus();
            document.execCommand('insertHTML', false, tableHtml);
        }

        insertTaskTable() {
            const tableHtml = `
                <div class="table-wrapper">
                    <table>
                        <tr><th>Header 1</th><th>Header 2</th></tr>
                        <tr><td>Cell 1</td><td>Cell 2</td></tr>
                    </table>
                    <button class="add-row-btn" onclick="window.taskManager.addTableRow(this)">+</button>
                    <button class="add-col-btn" onclick="window.taskManager.addTableColumn(this)">+</button>
                </div><p><br></p>
            `;
            document.getElementById('taskEditor').focus();
            document.execCommand('insertHTML', false, tableHtml);
        }

        addTableRow(btn) {
            const table = btn.parentElement.querySelector('table');
            const newRow = table.insertRow();
            const colCount = table.rows[0].cells.length;
            
            for (let i = 0; i < colCount; i++) {
                const cell = newRow.insertCell();
                cell.textContent = 'New Cell';
            }
        }

        addTableColumn(btn) {
            const table = btn.parentElement.querySelector('table');
            const rows = table.rows;
            
            for (let i = 0; i < rows.length; i++) {
                const cell = rows[i].insertCell();
                cell.textContent = i === 0 ? 'New Header' : 'New Cell';
            }
        }

        toggleFullscreen(modalId) {
            const modal = document.getElementById(modalId);
            modal.classList.toggle('fullscreen');
        }

        handleFileUpload(event) {
            const files = Array.from(event.target.files);
            const task = this.data.tasks.find(t => t.id === this.currentTaskId);
            if (!task) return;

            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const fileData = {
                        id: Date.now() + Math.random(),
                        name: file.name,
                        type: file.type,
                        data: e.target.result
                    };
                    
                    if (!task.files) task.files = [];
                    task.files.push(fileData);
                    this.renderFiles(task.files);
                    this.saveData();
                };
                reader.readAsDataURL(file);
            });
        }

        handleInitiativeFileUpload(event) {
            const files = Array.from(event.target.files);
            const initiative = this.data.initiatives.find(i => i.id === this.currentInitiativeId);
            if (!initiative) return;

            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const fileData = {
                        id: Date.now() + Math.random(),
                        name: file.name,
                        type: file.type,
                        data: e.target.result
                    };
                    
                    if (!initiative.files) initiative.files = [];
                    initiative.files.push(fileData);
                    this.renderInitiativeFiles(initiative.files);
                    this.saveData();
                };
                reader.readAsDataURL(file);
            });
        }

        renderFiles(files) {
            const container = document.getElementById('filesList');
            container.innerHTML = files.map(file => `
                <div class="file-item">
                    <span class="file-name">${this.getFileIcon(file.type, file.name)} ${file.name}</span>
                    <div class="file-actions">
                        <button class="btn btn-secondary" onclick="window.taskManager.previewFile('${file.id}', 'task')">Preview</button>
                        <button class="btn btn-secondary" onclick="window.taskManager.downloadFile(window.taskManager.getTaskFile('${file.id}'))">Download</button>
                        <button class="btn btn-secondary" onclick="window.taskManager.deleteFile('${file.id}')">Delete</button>
                    </div>
                </div>
            `).join('');
        }

        renderInitiativeFiles(files) {
            const container = document.getElementById('initiativeFilesList');
            container.innerHTML = files.map(file => `
                <div class="file-item">
                    <span class="file-name">${this.getFileIcon(file.type, file.name)} ${file.name}</span>
                    <div class="file-actions">
                        <button class="btn btn-secondary" onclick="window.taskManager.previewFile('${file.id}', 'initiative')">Preview</button>
                        <button class="btn btn-secondary" onclick="window.taskManager.downloadFile(window.taskManager.getInitiativeFile('${file.id}'))">Download</button>
                        <button class="btn btn-secondary" onclick="window.taskManager.deleteInitiativeFile('${file.id}')">Delete</button>
                    </div>
                </div>
            `).join('');
        }

        previewFile(fileId, type) {
            let file;
            if (type === 'task') {
                const task = this.data.tasks.find(t => t.id === this.currentTaskId);
                file = task.files.find(f => f.id == fileId);
            } else {
                const initiative = this.data.initiatives.find(i => i.id === this.currentInitiativeId);
                file = initiative.files.find(f => f.id == fileId);
            }
            
            if (!file) {
                console.log('File not found:', fileId);
                return;
            }

            console.log('Previewing file:', file.name, 'Type:', file.type);
            
            document.getElementById('previewFileName').textContent = file.name;
            document.getElementById('downloadPreviewFile').onclick = () => this.downloadFile(file);
            
            const container = document.getElementById('filePreviewContainer');
            container.innerHTML = '';
            
            const fileName = file.name.toLowerCase();
            const fileType = file.type || '';
            
            // Image files
            if (fileType.startsWith('image/') || this.isImageFile(fileName)) {
                console.log('Showing image preview');
                container.innerHTML = `<img src="${file.data}" alt="${file.name}" style="max-width: 100%; max-height: 60vh; object-fit: contain; display: block; margin: 0 auto;">`;
            }
            // PDF files
            else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
                console.log('Showing PDF preview');
                container.innerHTML = `<iframe src="${file.data}" style="width: 100%; height: 60vh; border: none;"></iframe>`;
            }
            // Text files
            else if (fileType.startsWith('text/') || this.isTextFile(fileName)) {
                console.log('Showing text preview');
                this.showTextPreview(file, container);
            }
            // Office files - attempt preview
            else if (this.isOfficeFile(fileType, fileName)) {
                console.log('Showing Office file preview attempt');
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <div style="font-size: 4rem; margin-bottom: 20px;">${this.getFileIcon(fileType, fileName)}</div>
                        <h3>${file.name}</h3>
                        <p><strong>File type:</strong> ${this.getFileTypeName(fileType, fileName)}</p>
                        <p style="margin-top: 20px;">Office documents require download to view properly.</p>
                        <button class="btn btn-primary" onclick="window.taskManager.downloadFile(window.taskManager.getCurrentFile('${fileId}', '${type}'))" style="margin-top: 15px;">Download to View</button>
                    </div>
                `;
            }
            // All other files
            else {
                console.log('Showing file info for unsupported type:', fileType);
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <div style="font-size: 4rem; margin-bottom: 20px;">${this.getFileIcon(fileType, fileName)}</div>
                        <h3>${file.name}</h3>
                        <p><strong>File type:</strong> ${this.getFileTypeName(fileType, fileName)}</p>
                        <p><strong>Size:</strong> ${this.formatFileSize(file.data.length)}</p>
                        <p style="margin-top: 20px;">Preview not available for this file type.<br>Click download to view the file.</p>
                    </div>
                `;
            }
            
            document.getElementById('filePreviewModal').style.display = 'block';
        }

        isImageFile(fileName) {
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
            return imageExtensions.some(ext => fileName.endsWith(ext));
        }

        isTextFile(fileName) {
            const textExtensions = ['.txt', '.md', '.csv', '.json', '.xml', '.html', '.css', '.js'];
            return textExtensions.some(ext => fileName.endsWith(ext));
        }

        showTextPreview(file, container) {
            try {
                const base64Data = file.data.split(',')[1];
                const text = atob(base64Data);
                container.innerHTML = `<pre style="text-align: left; white-space: pre-wrap; padding: 20px; background: #f8f9fa; border-radius: 8px; max-height: 60vh; overflow: auto; font-family: monospace;">${this.escapeHtml(text)}</pre>`;
            } catch (e) {
                console.error('Error showing text preview:', e);
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <div style="font-size: 4rem; margin-bottom: 20px;">📄</div>
                        <h3>${file.name}</h3>
                        <p>Text file preview failed</p>
                        <p>Click download to view the file</p>
                    </div>
                `;
            }
        }

        getCurrentFile(fileId, type) {
            if (type === 'task') {
                const task = this.data.tasks.find(t => t.id === this.currentTaskId);
                return task.files.find(f => f.id == fileId);
            } else {
                const initiative = this.data.initiatives.find(i => i.id === this.currentInitiativeId);
                return initiative.files.find(f => f.id == fileId);
            }
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        isOfficeFile(mimeType, fileName) {
            const officeTypes = [
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            ];
            
            const officeExtensions = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
            
            return officeTypes.includes(mimeType) || 
                   officeExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
        }

        getFileIcon(mimeType, fileName) {
            if (mimeType.startsWith('image/')) return '🖼️';
            if (mimeType === 'application/pdf') return '📄';
            if (fileName.toLowerCase().endsWith('.doc') || fileName.toLowerCase().endsWith('.docx')) return '📄';
            if (fileName.toLowerCase().endsWith('.xls') || fileName.toLowerCase().endsWith('.xlsx')) return '📈';
            if (fileName.toLowerCase().endsWith('.ppt') || fileName.toLowerCase().endsWith('.pptx')) return '📊';
            return '📁';
        }

        getFileTypeName(mimeType, fileName) {
            if (mimeType.startsWith('image/')) return 'Image';
            if (mimeType === 'application/pdf') return 'PDF Document';
            if (fileName.toLowerCase().endsWith('.doc') || fileName.toLowerCase().endsWith('.docx')) return 'Word Document';
            if (fileName.toLowerCase().endsWith('.xls') || fileName.toLowerCase().endsWith('.xlsx')) return 'Excel Spreadsheet';
            if (fileName.toLowerCase().endsWith('.ppt') || fileName.toLowerCase().endsWith('.pptx')) return 'PowerPoint Presentation';
            return mimeType || 'Unknown';
        }

        dataURLtoBlob(dataURL) {
            const arr = dataURL.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            return new Blob([u8arr], { type: mime });
        }

        getTaskFile(fileId) {
            const task = this.data.tasks.find(t => t.id === this.currentTaskId);
            return task.files.find(f => f.id == fileId);
        }

        getInitiativeFile(fileId) {
            const initiative = this.data.initiatives.find(i => i.id === this.currentInitiativeId);
            return initiative.files.find(f => f.id == fileId);
        }

        downloadFile(file) {
            if (!file) return;
            const link = document.createElement('a');
            link.href = file.data;
            link.download = file.name;
            link.click();
        }

        deleteFile(fileId) {
            const task = this.data.tasks.find(t => t.id === this.currentTaskId);
            task.files = task.files.filter(f => f.id != fileId);
            this.renderFiles(task.files);
            this.saveData();
        }

        deleteInitiativeFile(fileId) {
            const initiative = this.data.initiatives.find(i => i.id === this.currentInitiativeId);
            initiative.files = initiative.files.filter(f => f.id != fileId);
            this.renderInitiativeFiles(initiative.files);
            this.saveData();
        }

        loadArchivedWeek(weekNumber) {
            if (!weekNumber) {
                document.getElementById('archivesContainer').innerHTML = 
                    '<div class="empty-state"><h3>Select a week to view archived tasks</h3></div>';
                return;
            }

            const archivedData = this.data.archivedWeeks[weekNumber];
            if (!archivedData || archivedData.tasks.length === 0) {
                document.getElementById('archivesContainer').innerHTML = 
                    `<div class="empty-state"><h3>No tasks found for Week ${weekNumber}</h3></div>`;
                return;
            }

            document.getElementById('archivesContainer').innerHTML = archivedData.tasks.map(task => `
                <div class="archived-task">
                    <div class="task-header">
                        <div class="task-title">${task.name}</div>
                        <div class="task-status">${task.status.replace('-', ' ')}</div>
                    </div>
                </div>
            `).join('');
        }

        saveData() {
            localStorage.setItem('fahdAmitData', JSON.stringify(this.data));
        }

        render() {
            this.renderTasks();
            this.renderInitiatives();
        }

        renderTasks() {
            const container = document.getElementById('tasksContainer');
            
            if (this.data.tasks.length === 0) {
                container.innerHTML = '<div class="empty-state"><h3>No tasks yet</h3><p>Click "Add Task" to get started!</p></div>';
                return;
            }

            container.innerHTML = this.data.tasks.map(task => `
                <div class="task-item ${task.status}" 
                     onclick="window.taskManager.openTaskDetail(${task.id})"
                     oncontextmenu="window.taskManager.showContextMenu(event, 'task', ${task.id})">
                    <div class="task-header">
                        <div class="task-title">${task.name}</div>
                        <div class="task-status ${task.status}">${task.status.replace('-', ' ')}</div>
                    </div>
                </div>
            `).join('');
        }

        renderInitiatives() {
            const container = document.getElementById('initiativesContainer');
            
            if (this.data.initiatives.length === 0) {
                container.innerHTML = '<div class="empty-state"><h3>No initiatives yet</h3><p>Click "Add Initiative" to get started!</p></div>';
                return;
            }

            container.innerHTML = this.data.initiatives.map(initiative => `
                <div class="initiative-item ${initiative.status || 'yellow'}" 
                     onclick="window.taskManager.openInitiativeDetail(${initiative.id})"
                     oncontextmenu="window.taskManager.showContextMenu(event, 'initiative', ${initiative.id})">
                    <div class="initiative-header">
                        <div class="initiative-title">${initiative.name}</div>
                        <div class="initiative-status ${initiative.status || 'yellow'}">${this.getStatusEmoji(initiative.status || 'yellow')}</div>
                    </div>
                </div>
            `).join('');
        }

        showContextMenu(event, type, id) {
            event.preventDefault();
            event.stopPropagation();
            
            this.contextMenuType = type;
            this.contextMenuId = id;
            
            const contextMenu = document.getElementById('contextMenu');
            contextMenu.style.display = 'block';
            contextMenu.style.left = event.pageX + 'px';
            contextMenu.style.top = event.pageY + 'px';
        }

        hideContextMenu() {
            document.getElementById('contextMenu').style.display = 'none';
        }

        handleContextDelete() {
            if (this.contextMenuType === 'task') {
                this.deleteTask(this.contextMenuId);
            } else if (this.contextMenuType === 'initiative') {
                this.deleteInitiative(this.contextMenuId);
            }
            this.hideContextMenu();
        }

        deleteTask(taskId) {
            if (confirm('Are you sure you want to delete this task?')) {
                this.data.tasks = this.data.tasks.filter(t => t.id !== taskId);
                this.saveData();
                this.render();
            }
        }

        deleteInitiative(initiativeId) {
            if (confirm('Are you sure you want to delete this initiative?')) {
                this.data.initiatives = this.data.initiatives.filter(i => i.id !== initiativeId);
                this.saveData();
                this.render();
            }
        }

        getStatusEmoji(status) {
            const emojis = {
                red: '🔴',
                yellow: '🟡',
                green: '🟢'
            };
            return emojis[status] || '🟡';
        }
    }

    // Create global instance
    window.taskManager = new TaskManager();
});