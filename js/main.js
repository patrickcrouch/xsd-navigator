let currentXsdData = null;
let rootElements = [];
let pageCount = 0;
let pageStack = []; // Track page hierarchy

// DOM elements
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const openFileBtn = document.getElementById('openFileBtn');
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
    const pageContent = document.getElementById('pageContent-0');
    pageContent.innerHTML = '';
    
    rootElements.forEach(rootElement => {
        const elementDiv = createElementItem(rootElement);
        pageContent.appendChild(elementDiv);
    });

    // Calc and set page width
    calculatePageWidth('page-0');
}

function createElementItem(element) {
    const div = document.createElement('div');
    div.className = 'element-item';

    // Check for minOccurs = "0" attr
    const minOccurs = element.getAttribute('minOccurs');
    if (minOccurs === '0') {
        div.classList.add('optional')
    }
    
    const name = element.getAttribute('name') || element.getAttribute('ref');
    const type = element.getAttribute('type') || '';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'element-name';
    nameSpan.textContent = name;
    div.appendChild(nameSpan);

    
    if (type) {
        const typeSpan = document.createElement('span');
        typeSpan.className = 'element-type';
        typeSpan.textContent = type;
        div.appendChild(typeSpan);
    }
    
    // Check if element has children (is expandable)
    const hasChildren = hasChildElements(element);
    if (hasChildren) {
        div.addEventListener('click', () => {
            openElementPage(element, name);
        });
    } else {
        div.classList.add('non-expandable');
    }
    
    return div;
}

function openElementPage(element, elementName) {
    pageCount++;
    const pageId = `page-${pageCount}`;

    // Get child elements
    const childElements = getChildElements(element);

    // Create new page
    const page = document.createElement('div');
    page.className = 'page';
    page.id = pageId;

    const header = document.createElement('div');
    header.className = 'page-header';

    const title = document.createElement('span');
    title.className = 'page-title';
    title.textContent = elementName;
    header.appendChild(title);
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => closePage(pageId));
    header.appendChild(closeBtn);
    
    const content = document.createElement('div');
    content.className = 'page-content';
    content.id = `pageContent-${pageCount}`;
    
    // Add child elements
    childElements.forEach(childElement => {
        const elementDiv = createElementItem(childElement);
        content.appendChild(elementDiv);
    });
    
    page.appendChild(header);
    page.appendChild(content);
    
    // Position and add page
    positionNewPage(page, pageCount);
    document.getElementById('pagesContainer').appendChild(page);
    
    // Calculate width after adding to DOM
    calculatePageWidth(pageId);
    
    // Track in stack
    pageStack.push({
        id: pageId,
        count: pageCount,
        element: element,
        name: elementName
    });
}

function getChildElements(parentElement) {
    let complexType = parentElement.querySelector('complexType');
    
    if (!complexType) {
        const type = parentElement.getAttribute('type');
        if (type && currentXsdData) {
            complexType = currentXsdData.querySelector(`complexType[name="${type}"]`);
        }
    }
    
    if (complexType) {
        return Array.from(complexType.querySelectorAll('element'));
    }
    
    return [];
}

function positionNewPage(page, count) {
    const offset = (count - 1) * 40; // Stagger each page
    page.style.left = `${320 + offset}px`;
    page.style.top = `${offset}px`;
    page.style.zIndex = count;
}

function calculatePageWidth(pageId) {
    const page = document.getElementById(pageId);
    const items = page.querySelectorAll('.element-item');
    
    let maxWidth = 300; // Minimum width
    
    items.forEach(item => {
        // Create a temporary element to measure text width
        const temp = item.cloneNode(true);
        temp.style.position = 'absolute';
        temp.style.visibility = 'hidden';
        temp.style.width = 'auto';
        temp.style.whiteSpace = 'nowrap';
        document.body.appendChild(temp);
        
        const width = temp.offsetWidth + 40; // Add some padding
        maxWidth = Math.max(maxWidth, width);
        
        document.body.removeChild(temp);
    });
    
    page.style.width = `${Math.min(maxWidth, 600)}px`; // Cap at 600px
}

function closePage(pageId) {
    const page = document.getElementById(pageId);
    if (page) {
        page.remove();
        
        // Remove from stack
        pageStack = pageStack.filter(p => p.id !== pageId);
        
        // Close any pages that were opened after this one
        const pageNumber = parseInt(pageId.split('-')[1]);
        const pagesToClose = pageStack.filter(p => p.count > pageNumber);
        pagesToClose.forEach(p => {
            const pageToRemove = document.getElementById(p.id);
            if (pageToRemove) pageToRemove.remove();
        });
        pageStack = pageStack.filter(p => p.count <= pageNumber);
    }
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

function collapseAllNodes() {
    // Close all pages except the root page
    const pages = document.querySelectorAll('.page:not(#page-0)');
    pages.forEach(page => page.remove());
    pageStack = [];
    pageCount = 0;
}

function unloadFile() {
    currentXsdData = null;
    rootElements = [];
    pageStack = [];
    pageCount = 0;
    fileInput.value = '';
    openFileBtn.style.display = 'none';
    
    // Reset root page
    const pageContent = document.getElementById('pageContent-0');
    pageContent.innerHTML = '<p style="text-align: center; color: #666;">Select an XSD file to begin navigation</p>';
    
    // Remove all other pages
    const pages = document.querySelectorAll('.page:not(#page-0)');
    pages.forEach(page => page.remove());
    
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
    const displayArea = document.getElementById('displayArea');
    displayArea.innerHTML = `<div class="error">${message}</div>`;
}