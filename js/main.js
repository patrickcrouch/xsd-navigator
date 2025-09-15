let currentXsdData = null;
let rootElements = [];

// DOM elements
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const openFileBtn = document.getElementById('openFileBtn');
const displayArea = document.getElementById('displayArea');
const collapseAllBtn = document.getElementById('collapseAllBtn');
const unloadBtn = document.getElementById('unloadBtn');

// Event listeners
selectFileBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelection);
openFileBtn.addEventListener('click', parseAndDisplayXsd);
collapseAllBtn.addEventListener('click', collapseAllNodes);
unloadBtn.addEventListener('click', unloadFile);

function handleFileSelection(event) {
    const file = event.target.files[0];
    if (file) {
        openFileBtn.style.display = 'inline-block';
    }
}

function parseAndDisplayXsd() {
    const file = fileInput.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const xmlText = e.target.result;
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            
            // Check for XML parsing errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                throw new Error('Invalid XML: ' + parserError.textContent);
            }
            
            currentXsdData = xmlDoc;
            findAndDisplayRootElements(xmlDoc);
            
        } catch (error) {
            displayError(error.message);
        }
    };
    reader.readAsText(file);
}

function findAndDisplayRootElements(xmlDoc) {
    // Look for root elements in XSD schema
    // An element is considered a root if it's not referenced by other elements
    const schema = xmlDoc.documentElement;
    
    if (schema.tagName !== 'xs:schema' && schema.tagName !== 'schema') {
        throw new Error('Not a valid XSD schema file');
    }
    
    // Find all element definitions
    const elements = Array.from(schema.querySelectorAll(':scope > element[name]'));
    const complexTypes = Array.from(schema.querySelectorAll('complexType[name]'));
    
    if (elements.length === 0) {
        throw new Error('XML is valid, but no root element exists; cannot parse');
    }
    
    // Find elements that are not referenced by other elements (potential roots)
    const referencedElements = new Set();
    
    // Check for element references in complexType definitions
    complexTypes.forEach(complexType => {
        const refs = complexType.querySelectorAll('element[ref]');
        refs.forEach(ref => {
            referencedElements.add(ref.getAttribute('ref'));
        });
    });
    
    // Check for element references in other elements
    elements.forEach(element => {
        const refs = element.querySelectorAll('element[ref]');
        refs.forEach(ref => {
            referencedElements.add(ref.getAttribute('ref'));
        });
    });
    
    // Root elements are those not referenced by others
    rootElements = elements.filter(element => {
        const name = element.getAttribute('name');
        return !referencedElements.has(name);
    });
    
    if (rootElements.length === 0) {
        throw new Error('XML is valid, but no root element exists; cannot parse');
    }
    
    displayElements();
    showControls();
}

function displayElements() {
    displayArea.innerHTML = '';
    
    rootElements.forEach(rootElement => {
        const elementDiv = createElementNode(rootElement, 0);
        displayArea.appendChild(elementDiv);
    });
}

function createElementNode(element, depth) {
    const div = document.createElement('div');
    div.className = 'element-node';

    // Check for minOccurs = "0" attr
    const minOccurs = element.getAttribute('minOccurs');
    if (minOccurs === '0') {
        div.classList.add('optional')
    }
    
    const name = element.getAttribute('name') || element.getAttribute('ref');
    const nameSpan = document.createElement('span');
    nameSpan.className = 'element-name';
    nameSpan.textContent = name;
    div.appendChild(nameSpan);

    const type = element.getAttribute('type');
    if (type) {
        const typeSpan = document.createElement('span');
        typeSpan.className = 'element-type';
        typeSpan.textContent = type;
        div.appendChild(typeSpan);
    }
    
    // Check if element has children (is expandable)
    const hasChildren = hasChildElements(element);
    if (hasChildren) {
        div.classList.add('expandable');
        const icon = document.createElement('span');
        icon.className = 'expand-icon';
        icon.textContent = '+';
        div.appendChild(icon);
        
        // Create children container
        const childrenDiv = document.createElement('div');
        childrenDiv.className = 'children';
        div.appendChild(childrenDiv);
        
        // Add click handler for expansion
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleElement(div, element);
        });
    }
    
    return div;
}

function hasChildElements(element) {
    // Check if element has a complexType with child elements
    const complexType = element.querySelector('complexType');
    if (complexType) {
        const childElements = complexType.querySelectorAll('element');
        return childElements.length > 0;
    }
    
    // Check if element references a named complexType
    const type = element.getAttribute('type');
    if (type && currentXsdData) {
        const namedComplexType = currentXsdData.querySelector(`complexType[name="${type}"]`);
        if (namedComplexType) {
            const childElements = namedComplexType.querySelectorAll('element');
            return childElements.length > 0;
        }
    }
    
    return false;
}

function toggleElement(div, element) {
    const childrenDiv = div.querySelector('.children');
    const icon = div.querySelector('.expand-icon');
    
    if (childrenDiv.classList.contains('expanded')) {
        // Collapse
        childrenDiv.classList.remove('expanded');
        icon.textContent = '+';
    } else {
        // Expand
        if (childrenDiv.children.length === 0) {
            // Load children for first time
            loadChildElements(element, childrenDiv);
        }
        childrenDiv.classList.add('expanded');
        icon.textContent = '-';
    }
}

function loadChildElements(parentElement, container) {
    let complexType = parentElement.querySelector('complexType');
    
    // If no inline complexType, look for named type reference
    if (!complexType) {
        const type = parentElement.getAttribute('type');
        if (type && currentXsdData) {
            complexType = currentXsdData.querySelector(`complexType[name="${type}"]`);
        }
    }
    
    if (complexType) {
        const childElements = complexType.querySelectorAll('element');
        childElements.forEach(childElement => {
            const childNode = createElementNode(childElement, 1);
            container.appendChild(childNode);
        });
    }
}

function collapseAllNodes() {
    const expandedChildren = displayArea.querySelectorAll('.children.expanded');
    expandedChildren.forEach(child => {
        child.classList.remove('expanded');
    });
    
    const expandIcons = displayArea.querySelectorAll('.expand-icon');
    expandIcons.forEach(icon => {
        icon.textContent = '+';
    });
}

function unloadFile() {
    currentXsdData = null;
    rootElements = [];
    fileInput.value = '';
    openFileBtn.style.display = 'none';
    displayArea.innerHTML = '<p style="text-align: center; color: #666;">Select an XSD file to begin navigation</p>';
    hideControls();
}

function showControls() {
    collapseAllBtn.style.display = 'inline-block';
    unloadBtn.style.display = 'inline-block';
}

function hideControls() {
    collapseAllBtn.style.display = 'none';
    unloadBtn.style.display = 'none';
}

function displayError(message) {
    displayArea.innerHTML = `<div class="error">${message}</div>`;
}