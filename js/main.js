let currentXsdData = null;
let rootElements = [];

// DOM elements
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const collapseAllBtn = document.getElementById('collapseAllBtn');
const unloadBtn = document.getElementById('unloadBtn');

// Event listeners
selectFileBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', parseAndDisplayXsd);
collapseAllBtn.addEventListener('click', collapseAllNodes);
unloadBtn.addEventListener('click', unloadFile);

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
            const pageContent = document.getElementById('pageContent-0');
            pageContent.innerHTML = `<p style="text-align: center; color: #fca5a5;">Error: ${error.message}</p>`;
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
}

function createElementItem(element) {
    const container = document.createElement('div');
    container.className = 'element-container';

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
        const expandIcon = document.createElement('span');
        expandIcon.className = 'expand-icon';
        expandIcon.textContent = '+';
        div.appendChild(expandIcon);

        div.addEventListener('click', () => {
            toggleElementExpansion(container, element);
        });
    } else {
        div.classList.add('non-expandable');
    }

    container.appendChild(div);
    return container;
}

function toggleElementExpansion(container, element) {
    const existingExpansion = container.querySelector('.element-expansion');

    if (existingExpansion) {
        // Collapse: remove the expansion
        existingExpansion.remove();
        container.querySelector('.element-item').classList.remove('expanded');
    } else {
        // Expand: create the expansion
        const childElements = getChildElements(element);

        if (childElements.length > 0) {
            const expansion = document.createElement('div');
            expansion.className = 'element-expansion';

            const content = document.createElement('div');
            content.className = 'expansion-content';

            // Add child elements
            childElements.forEach(childElement => {
                const elementDiv = createElementItem(childElement);
                content.appendChild(elementDiv);
            });

            expansion.appendChild(content);
            container.appendChild(expansion);
            container.querySelector('.element-item').classList.add('expanded');
        }
    }
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
    // Close all expansions
    const expansions = document.querySelectorAll('.element-expansion');
    expansions.forEach(expansion => expansion.remove());

    // Remove expanded class from all element items
    const expandedItems = document.querySelectorAll('.element-item.expanded');
    expandedItems.forEach(item => item.classList.remove('expanded'));
}

function unloadFile() {
    currentXsdData = null;
    rootElements = [];
    fileInput.value = '';

    // Reset root page
    const pageContent = document.getElementById('pageContent-0');
    pageContent.innerHTML = '<p style="text-align: center; color: #666;">Select an XSD file to begin navigation</p>';

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

