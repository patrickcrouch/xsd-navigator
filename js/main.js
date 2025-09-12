// Global variables
let selectedFile = null;
let xsdDocument = null;
let currentSelectedNode = null;

// DOM elements
const fileInput = document.getElementById('xsdFile');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const openButton = document.getElementById('openButton');
const statusMessage = document.getElementById('statusMessage');
const xsdDisplay = document.getElementById('xsdDisplay');
const nodeContainer = document.getElementById('nodeContainer');
const sidePanelContent = document.getElementById('sidePanelContent');

// Event listeners
fileInput.addEventListener('change', handleFileSelection);
openButton.addEventListener('click', handleFileOpen);

function handleFileSelection(event) {
    const file = event.target.files[0];
    
    if (file) {
        selectedFile = file;
        
        // Display file information
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        
        // Show file info and open button
        fileInfo.classList.add('visible');
        openButton.classList.add('visible');
        
        // Hide any previous status messages
        hideStatusMessage();
    }
}

function handleFileOpen() {
    if (!selectedFile) {
        showStatusMessage('No file selected', 'error');
        return;
    }

    // Check file type
    if (!isValidFileType(selectedFile.name)) {
        showStatusMessage('Please select a valid XSD or XML file', 'error');
        return;
    }

    // Read and parse the file
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            showStatusMessage('Parsing XSD file...', 'success');
            parseXSD(e.target.result);
        } catch (error) {
            showStatusMessage('Error parsing XSD file: ' + error.message, 'error');
            console.error('XSD parsing error:', error);
        }
    };
    
    reader.onerror = function() {
        showStatusMessage('Error reading file', 'error');
    };
    
    reader.readAsText(selectedFile);
}

function parseXSD(xmlContent) {
    try {
        // Parse XML
        const parser = new DOMParser();
        xsdDocument = parser.parseFromString(xmlContent, 'text/xml');
        
        // Check for parsing errors
        const parserError = xsdDocument.querySelector('parsererror');
        if (parserError) {
            throw new Error('XML parsing error: ' + parserError.textContent);
        }
        
        // Find the root schema element
        const schema = xsdDocument.querySelector('schema') || 
                        xsdDocument.querySelector('[*|schema]') ||
                        xsdDocument.documentElement;
        
        if (!schema) {
            throw new Error('No schema element found in the file');
        }
        
        // Extract root elements
        const rootElements = extractRootElements(schema);
        
        if (rootElements.length === 0) {
            showStatusMessage('No root elements found in schema', 'error');
            return;
        }
        
        // Display the XSD structure
        displayXSDStructure(rootElements);
        showStatusMessage('XSD loaded successfully!', 'success');
        
    } catch (error) {
        throw new Error('Failed to parse XSD: ' + error.message);
    }
}

function extractRootElements(schema) {
    const elements = [];
    
    // Find all top-level element definitions
    const elementNodes = schema.querySelectorAll(':scope > *');
    
    elementNodes.forEach(element => {
        const elementInfo = {
            name: element.getAttribute('name') || 'unnamed',
            type: element.getAttribute('type') || 'untyped',
            element: element,
            hasChildren: hasChildElements(element)
        };
        elements.push(elementInfo);
    });
    
    // If no top-level elements, try to find the first element in the schema
    if (elements.length === 0) {
        const firstElement = schema.querySelector('*[local-name()="element"]');
        if (firstElement) {
            elements.push({
                name: firstElement.getAttribute('name') || 'root',
                type: firstElement.getAttribute('type') || 'complex',
                element: firstElement,
                hasChildren: hasChildElements(firstElement)
            });
        }
    }
    
    return elements;
}

function hasChildElements(element) {
    // Check if element has complexType with sequence, choice, etc.
    const complexType = element.querySelector('complexType');
    if (complexType) {
        return complexType.querySelector('sequence, choice, all, group') !== null;
    }
    
    // Check if it references a type that might have children
    const typeAttr = element.getAttribute('type');
    if (typeAttr && !isSimpleType(typeAttr)) {
        return true;
    }
    
    return false;
}

function isSimpleType(type) {
    // Basic XSD simple types
    const simpleTypes = ['string', 'int', 'integer', 'decimal', 'boolean', 'date', 'dateTime', 
                        'time', 'double', 'float', 'byte', 'short', 'long', 'base64Binary'];
    return simpleTypes.some(t => type.includes(t));
}

function displayXSDStructure(elements) {
    // Clear previous content
    nodeContainer.innerHTML = '';
    
    // Show the XSD display area
    xsdDisplay.classList.add('visible');
    
    // Create nodes for root elements
    elements.forEach(elementInfo => {
        const nodeElement = createNodeElement(elementInfo);
        nodeContainer.appendChild(nodeElement);
    });
    
    // Select the first element by default
    if (elements.length > 0) {
        const firstNode = nodeContainer.querySelector('.node');
        if (firstNode) {
            selectNode(firstNode, elements[0]);
        }
    }
}

function createNodeElement(elementInfo) {
    const nodeDiv = document.createElement('div');
    nodeDiv.className = 'node';
    nodeDiv.setAttribute('data-element-name', elementInfo.name);
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'node-name';
    nameDiv.textContent = elementInfo.name;
    nodeDiv.appendChild(nameDiv);
    
    const typeDiv = document.createElement('div');
    typeDiv.className = 'node-type';
    typeDiv.textContent = elementInfo.type;
    nodeDiv.appendChild(typeDiv);
    
    // Add expand icon if element has children
    if (elementInfo.hasChildren) {
        const expandIcon = document.createElement('div');
        expandIcon.className = 'expand-icon';
        expandIcon.textContent = '+';
        nodeDiv.appendChild(expandIcon);
    }
    
    // Add click handler
    nodeDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        selectNode(nodeDiv, elementInfo);
    });
    
    // Store element info for later use
    nodeDiv._elementInfo = elementInfo;
    
    return nodeDiv;
}

function selectNode(nodeElement, elementInfo) {
    // Remove previous selection
    document.querySelectorAll('.node.selected').forEach(node => {
        node.classList.remove('selected');
    });
    
    // Select current node
    nodeElement.classList.add('selected');
    currentSelectedNode = nodeElement;
    
    // Update side panel
    updateSidePanel(elementInfo);
}

function updateSidePanel(elementInfo) {
    let content = `<h4>Element: ${elementInfo.name}</h4>`;
    content += `<p><strong>Type:</strong> ${elementInfo.type}</p>`;
    
    // Add attributes if they exist
    const attributes = elementInfo.element.attributes;
    if (attributes.length > 0) {
        content += '<h5>Attributes:</h5><ul>';
        for (let attr of attributes) {
            if (attr.name !== 'name' && attr.name !== 'type') {
                content += `<li><strong>${attr.name}:</strong> ${attr.value}</li>`;
            }
        }
        content += '</ul>';
    }
    
    // Add documentation if it exists
    const documentation = elementInfo.element.querySelector('documentation');
    if (documentation) {
        content += `<h5>Documentation:</h5><p>${documentation.textContent}</p>`;
    }
    
    sidePanelContent.innerHTML = content;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function isValidFileType(fileName) {
    const validExtensions = ['.xsd', '.xml'];
    const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return validExtensions.includes(fileExtension);
}

function showStatusMessage(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type} visible`;
}

function hideStatusMessage() {
    statusMessage.classList.remove('visible', 'error', 'success');
}