# GitLab MR Viewer

A static web application that allows you to view GitLab merge requests using your Personal Access Token (PAT). The app saves your token locally for convenience and provides a mobile-responsive interface.

## Features

- 🔐 **Secure Token Storage**: Saves your GitLab Personal Access Token in localStorage
- 📱 **Mobile Responsive**: Optimized for both desktop and mobile devices
- 🎨 **Modern UI**: Clean, intuitive interface with smooth animations
- 🔍 **MR Parsing**: Automatically parses merge request URLs
- 💾 **Persistent Storage**: Remembers your settings between sessions
- ⌨️ **Keyboard Shortcuts**: Quick access to key functions
- 🌙 **Dark Mode Support**: Automatically adapts to system preferences

## Setup

### 1. Get a GitLab Personal Access Token

1. Go to your GitLab instance (e.g., https://gitlab.com)
2. Click on your profile picture → **Preferences**
3. Go to **Access Tokens** in the left sidebar
4. Create a new token with the following scopes:
   - `read_api` (to read merge requests)
   - `read_user` (to read user information)
5. Copy the generated token (it starts with `glpat-`)

### 2. Use the Application

1. Open `index.html` in your web browser
2. Enter your Personal Access Token
3. Optionally customize your GitLab instance URL
4. Click "Save Token"
5. Enter a merge request URL and click "View MR"

## Usage

### First Time Setup

1. **Enter Personal Access Token**: Input your GitLab PAT (starts with `glpat-`)
2. **Set GitLab URL**: Default is `https://gitlab.com`, change if using self-hosted GitLab
3. **Save Token**: Click the save button to store your credentials locally

### Viewing Merge Requests

1. **Enter MR URL**: Paste any GitLab merge request URL
2. **View Details**: The app will fetch and display:
   - MR title and number
   - Status (open, closed, merged)
   - Author and timestamps
   - Source and target branches
   - Full description with markdown formatting

### Navigation

- **Change Token**: Click to modify your stored PAT
- **New MR**: Start over with a different merge request
- **Open in GitLab**: View the original MR in GitLab
- **Keyboard Shortcuts**:
  - `Ctrl/Cmd + K`: Focus PAT input
  - `Ctrl/Cmd + L`: Focus MR URL input
  - `Enter`: Submit current form
  - `Escape`: Go back to previous section

## File Structure

```
gitlab-webapp/
├── index.html          # Main HTML file
├── styles.css          # CSS styles with mobile responsiveness
├── script.js           # JavaScript application logic
└── README.md           # This file
```

## Security Features

- **Local Storage Only**: Your PAT is never sent to external servers
- **Secure Input**: Password field with toggle visibility
- **Token Validation**: Basic format validation before saving
- **Automatic Clearing**: PAT input is cleared after saving

## Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

### Common Issues

1. **"Unauthorized" Error**
   - Check your Personal Access Token is correct
   - Ensure the token has the required scopes
   - Verify the GitLab instance URL is correct

2. **"MR Not Found" Error**
   - Check the merge request URL is valid
   - Ensure the MR exists and you have access to it
   - Verify the project path in the URL

3. **Token Not Saving**
   - Check if localStorage is enabled in your browser
   - Try clearing browser data and retry

### Reset Application

To clear all saved data and start fresh, run this in your browser console:
```javascript
clearGitLabData()
```

## Development

### Local Development

1. Clone or download the files
2. Open `index.html` in a web browser
3. No build process required - it's a static application

### Customization

- **Styling**: Modify `styles.css` for visual changes
- **Functionality**: Edit `script.js` for behavior changes
- **Layout**: Update `index.html` for structural changes

### API Endpoints Used

The application uses GitLab's REST API v4:
- `GET /api/v4/projects/{id}/merge_requests/{mr_id}`

## License

This project is open source and available under the MIT License.

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve the application.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the browser console for error messages
3. Ensure your GitLab instance and token are working correctly

---

**Note**: This application runs entirely in your browser and does not store your Personal Access Token on any external servers. Your data remains private and local to your device.
