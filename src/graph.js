/**
 * ComponentGraph - Wrapper around analyze results with indexes
 * Provides efficient lookups and reverse dependency tracking
 */
class ComponentGraph {
  constructor(analyzeResult) {
    // Validate input
    if (!analyzeResult || typeof analyzeResult !== 'object') {
      throw new TypeError('analyzeResult must be an object');
    }
    
    this.components = Array.isArray(analyzeResult.components) ? analyzeResult.components : [];
    this.rootPath = analyzeResult.rootPath || '';
    this.languages = analyzeResult.languages || {};
    this.directories = Array.isArray(analyzeResult.directories) ? analyzeResult.directories : [];
    
    // Validate and limit component count
    if (this.components.length > 10000) {
      console.warn(`Warning: Limiting to 10000 components (received ${this.components.length})`);
      this.components = this.components.slice(0, 10000);
    }
    
    // Build indexes for efficient lookups
    this._buildIndexes();
  }

  /**
   * Build lookup indexes
   * @private
   */
  _buildIndexes() {
    // Component name -> component
    this._componentByName = new Map();
    
    // File path -> component
    this._componentByPath = new Map();
    
    // Component name -> dependent component names (reverse lookup)
    this._dependents = new Map();
    
    // Track duplicates
    const seenNames = new Set();
    
    for (const component of this.components) {
      // Index by name
      if (component.name) {
        if (seenNames.has(component.name)) {
          console.warn(`Warning: Duplicate component name "${component.name}"`);
        } else {
          seenNames.add(component.name);
          this._componentByName.set(component.name, component);
        }
      }
      
      // Index by file path
      if (component.filePath) {
        this._componentByPath.set(component.filePath, component);
      }
      
      // Initialize dependents list
      if (component.name) {
        this._dependents.set(component.name, []);
      }
    }
    
    // Build reverse dependency index using Set for O(1) lookup
    for (const component of this.components) {
      if (Array.isArray(component.dependencies)) {
        for (const depName of component.dependencies) {
          if (!this._dependents.has(depName)) {
            this._dependents.set(depName, []);
          }
          const dependents = this._dependents.get(depName);
          if (!dependents.includes(component.name)) {
            dependents.push(component.name);
          }
        }
      }
    }
  }

  /**
   * Get component by name
   * @param {string} name - Component name
   * @returns {Object|undefined}
   */
  getComponent(name) {
    return this._componentByName.get(name);
  }

  /**
   * Get component by file path
   * @param {string} filePath - File path
   * @returns {Object|undefined}
   */
  getComponentByPath(filePath) {
    return this._componentByPath.get(filePath);
  }

  /**
   * Get direct dependencies of a component
   * @param {string} componentName - Component name
   * @returns {Array<Object>}
   */
  getDependencies(componentName) {
    const component = this._componentByName.get(componentName);
    if (!component || !Array.isArray(component.dependencies)) {
      return [];
    }
    
    return component.dependencies
      .map(depName => this._componentByName.get(depName))
      .filter(Boolean);
  }

  /**
   * Get components that depend on a given component (reverse lookup)
   * @param {string} componentName - Component name
   * @returns {Array<Object>}
   */
  getDependents(componentName) {
    const dependentNames = this._dependents.get(componentName) || [];
    return dependentNames
      .map(name => this._componentByName.get(name))
      .filter(Boolean);
  }

  /**
   * Find circular dependencies (for Phase 2)
   * @returns {Array<Array<string>>} Array of cycles, each cycle is an array of component names
   */
  findCycles() {
    const cycles = [];
    const visited = new Set();
    const MAX_DEPTH = 1000; // Prevent stack overflow

    for (const startComponent of this.components) {
      if (!startComponent.name || visited.has(startComponent.name)) {
        continue;
      }

      // Iterative DFS with explicit stack to avoid recursion limits
      const stack = [{ name: startComponent.name, path: [], depth: 0 }];
      const recursionStack = new Set();

      while (stack.length > 0) {
        const { name, path, depth } = stack.pop();
        
        if (depth > MAX_DEPTH) {
          console.warn(`Warning: Dependency depth exceeds ${MAX_DEPTH}, possible cycle or deep graph`);
          continue;
        }

        if (recursionStack.has(name)) {
          // Found a cycle
          const cycleStart = path.indexOf(name);
          if (cycleStart !== -1) {
            const cycle = path.slice(cycleStart).concat([name]);
            cycles.push(cycle);
          }
          continue;
        }

        if (visited.has(name) && name !== startComponent.name) {
          continue;
        }

        visited.add(name);
        recursionStack.add(name);

        const component = this._componentByName.get(name);
        if (component && Array.isArray(component.dependencies)) {
          for (const dep of component.dependencies) {
            if (dep) { // Skip null/undefined dependencies
              stack.push({
                name: dep,
                path: [...path, name],
                depth: depth + 1
              });
            }
          }
        }

        recursionStack.delete(name);
      }
    }

    return cycles;
  }

  /**
   * Get all files that match a layer pattern
   * @param {Array<Function>} matchers - Compiled picomatch functions
   * @returns {Array<Object>}
   */
  getFilesInLayer(matchers) {
    if (!Array.isArray(matchers)) {
      return [];
    }
    
    return this.components.filter(component => {
      if (!component || typeof component.filePath !== 'string') return false;
      return matchers.some(matcher => {
        try {
          return matcher(component.filePath);
        } catch (e) {
          return false;
        }
      });
    });
  }

  /**
   * Get total number of components
   * @returns {number}
   */
  get size() {
    return this.components.length;
  }
}

module.exports = { ComponentGraph };
