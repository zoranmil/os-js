# OpenShop Engine — Testing Environment

### 🚀 [Launch Live Demo Here](https://github.io)

This repository serves as a live sandbox and testing environment for developing, testing, and demonstrating custom JavaScript modules and notification systems integrated within the OpenShop (OS) core library.

# Testing Environment for Custom JS Framework, Modules, and Notifications

This repository serves as a sandbox and testing environment for developing, testing, and demonstrating custom JavaScript modules and notification systems integrated within the OpenShop (OS) core library.

## Module Testing Checklist
*   **4. KEYWORDS / TAGS (TagsInput):**
    *   **4.a** Standard birthday or general date input (Past dates allowed)
    *   **4.b** Color Picker
*   **Product Form Structure:**
    1. Product Name
    2. Category (Single Selection)
    3. Tags (Multiple Selection)
    4. Product Image (Click or drag & drop image here | Supported formats: JPG, PNG, WEBP)

---

## 1. Custom Selects Module
### Documentation and User Guide

This module converts standard HTML `<select>` elements into modern dropdown menus featuring local search filtering and asynchronous AJAX search capabilities, while fully preserving selected values (Select2 logic alignment).

### 1. Initialization
Initialize the module directly through your OpenShop (OS) library instance:

```javascript
// Minimal local mode
OS('#my-select').Selects();
```

### 2. Full Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `issearch` | Boolean | `false` | Displays a text input field to search and filter dropdown options. |
| `placeholder` | String | `'Select'` | Default placeholder text displayed on the main dropdown button. |
| `ajaxUrl` | String | `''` | Server endpoint URL. Providing this automatically enables AJAX remote search mode. |
| `data` | Object | `{ q: 'q' }` | The format of the GET parameters sent to the server (e.g., `{ query: '' }`). |
| `onSelect` | Function | `null` | Callback function triggered immediately after an option is selected. |

### 3. Operation Modes (Examples)

#### A) Local Multiselect (The module automatically detects the `multiple` attribute in HTML):
```javascript
OS('#tags').Selects({
    issearch: true,
    selectedText: 'Selected tags'
});
```

#### B) Advanced AJAX Search (Select2 behavior with built-in Debounce support):
```javascript
OS('#users').Selects({
    issearch: true,
    ajaxUrl: '/api/search.php',
    data: { query: '' }, // Server receives: ?query=user_entered_text
    selectedText: 'Selected users',
    onSelect: function(value, text, isChecked, plugin) {
        console.log("Selected ID:", value, "Status:", isChecked);
    }
});
```

### 4. Expected Server JSON Format
Your backend script must return a clean JSON array of objects using either of the following formats:

```json
[
  { "id": "1", "text": "John Doe" },
  { "id": "2", "text": "Jane Smith" }
]
```

*Example Use Case:* Select shipment status (Custom Dropdown).

---

## 2. Custom ImagePreview Module (AJAX Upload)
### Documentation and User Guide

This module transforms a native `<input type="file">` into an advanced Drag & Drop image upload zone with lightning-fast local preview rendering. If an upload URL is provided in the configuration, the image is instantly uploaded to the server in the background via an asynchronous `FormData` object, eliminating the need for page reloads or manual form submissions.

### 1. Initialization and Setup
Execute the module setup directly via your `OS.fn` prototype with asynchronous upload support:

```javascript
// Activation with automatic background AJAX upload
OS('#image-input').ImagePreview({
    uploadUrl: '/api/upload-image.php',
    uploadData: { folder: 'products', _token: 'CSRF_123' }, // Additional payloads
    onUploadSuccess: function(response, plugin) {
        console.log("Server successfully received the image!", response);
    },
    onUploadError: function(xhr, status, plugin) {
        OS.notify.error("Upload failed!");
    }
});
```

### 2. Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `uploadUrl` | String | `''` | Your API endpoint. If provided, triggers an automatic AJAX upload immediately after a file is chosen. |
| `uploadData` | Object | `{}` | Additional key-value pairs appended to the upload payload (e.g., User IDs, security tokens). |
| `onUploadSuccess`| Function | `null` | Callback function executed upon a successful server response (HTTP 200). |
| `onUploadError` | Function | `null` | Callback function executed if the server returns an error or the connection drops. |
| `onChange` | Function | `null` | Local callback triggered as soon as the browser finishes rendering the image in the UI preview zone. |

### 3. Instance API Methods
Control the module programmatically using the created instance handle:
*   `instance.clear()` – Fully resets the input field, removes the preview element, and clears memory.
*   `instance.getBase64()` – Returns the Base64 representation of the image (ideal for offline drafts).
*   `instance.getFile()` – Returns the raw native `File` object for manual script manipulation.

### 4. Deep Dive: Under-the-Hood Mechanisms

#### Hybrid Preview System
The module leverages a **Blob Object URL** for instantaneous image previews. Unlike memory-heavy Base64 encoding strings, a Blob reference directly maps to the file stored in RAM, allowing a 10MB image to render visually within milliseconds.

#### Automatic RAM Garbage Collection
Every time a user updates or overrides an image, the module internally executes `URL.revokeObjectURL()`. This crucial cleanup lifecycle prevents critical browser memory leaks that would otherwise occur by leaving detached previews lingering in RAM.

#### Asynchronous FormData Pipeline
During server transmission, the file is packaged inside a native JavaScript `FormData` object. This seamlessly mimics a classic multi-part form submission, meaning your backend handles it effortlessly using regular native globals (e.g., standard `$_FILES` arrays in PHP).

#### Race Condition Mitigation (`isUploading` lock)
An internal execution barrier blocks duplicate simultaneous uploads. While a transfer is active, a structural visual overlay locks the UI component down until the server returns an official success or error status.

#### Operational Workflow:
1.  **Validation:** Evaluates file MIME types. If the file is not an image, execution safely terminates.
2.  **Rendering:** Generates a local Blob URL and projects it into the `.image-preview-render` zone.
3.  **Upload:** If `uploadUrl` is declared, an `XMLHttpRequest` with the `FormData` payload initializes.
4.  **Feedback Sync:** UI overlays adjust, and corresponding success/error callbacks fire based on HTTP responses.

---

## 3. Core Notify Module (Dynamic API v2.7.0)
### Documentation and User Guide

A global notification engine integrated natively into the core `OS.notify` namespace. Built upon a **Zero-HTML philosophy**, this component requires no hardcoded static HTML wrappers on your pages—it dynamically renders and injects its own responsive Bootstrap template wrappers into the DOM at runtime upon its first call.

### 1. Methods and Execution
Trigger items directly using namespaces. The engine handles transient Toast notifications as well as blocking confirmation Modals:

```javascript
// Triggering a short-lived Toast notification (Auto-hides)
OS.notify.success('Data saved successfully!', 3000);

// Triggering a structural Modal Dialog (Requires explicit user interaction)
OS.notify.confirm2('Are you sure you want to delete this item?', function() {
    console.log('Action confirmed by the user');
}, 'Confirm Action');
```

### 2. Available Methods Reference

| Method | Type | Description |
| :--- | :--- | :--- |
| `success(msg, dur)` | Toast | A green visual notification banner featuring a self-destruction hide timer. |
| `error(msg, dur)` | Toast | A red visual error alert banner built for critical systems or failure state reports. |
| `loading(msg)` | Toast | A dark contextual banner containing an animated spinner. Remains fixed until `hide()` is called. |
| `alert(msg, title)` | Modal | A blocking alert dialog window requiring a simple user acknowledgement ("OK"). |
| `confirm2(msg, cb, title)` | Modal | A decision dialog window carrying structural success callbacks hooked to confirmation clicks. |

### 3. Under-the-Hood Architectural Design

#### Zero-HTML DOM Injection
An internal initialization runtime check (`_ensureHtmlExists()`) continuously scans the live webpage layout for target nodes. If the base layout is absent, the module executes a runtime layout injection, rendering bootstrap configurations right before the closing `<body>` tag.

#### System Lifecycle Control
Every incoming execution call safely routes through a dedicated internal cleanup routine (`_reset()`). This function instantly flushes out existing processing timers (`clearTimeout`) and unbinds prior event listeners, eliminating cascading animations and overlapping button clicks.

#### Hardware-Accelerated Rendering
UI presentation switches rely on native CSS opacity rendering. The internal `hide()` transition holds execution for exactly 300ms (matching the component's transition limits) before declaring a complete `display: none` layout state to guarantee flawless framerates.

#### Asynchronous Callback Synchronization
Inside the `confirm2` dialog pipeline, consumer execution logic is safely isolated. The target actions are bound only to physical user acceptances ("Continue"). The module blocks front-end operations, hides the viewport overlay, and triggers structural processing chains strictly on demand.
