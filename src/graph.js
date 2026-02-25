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
    const state = new Map(); // 0/undefined=unvisited, 1=visiting, 2=done
    const MAX_DEPTH = 1000;
    const seenCycles = new Set();

    const canonicalizeCycle = (cycle) => {
      const nodes = cycle.slice(0, -1); // remove repeated end node
      if (nodes.length === 0) return '';
      let minIndex = 0;
      for (let i = 1; i < nodes.length; i++) {
        if (nodes[i] < nodes[minIndex]) {
          minIndex = i;
        }
      }
      const rotated = nodes.slice(minIndex).concat(nodes.slice(0, minIndex));
      return rotated.join('->');
    };

    for (const startComponent of this.components) {
      if (!startComponent.name) continue;
      if (state.get(startComponent.name) === 2) continue;

      const stack = [{
        name: startComponent.name,
        deps: this.getDependencies(startComponent.name).map(dep => dep.name).filter(Boolean),
        nextIndex: 0
      }];
      const path = [];

      while (stack.length > 0) {
        if (stack.length > MAX_DEPTH) {
          console.warn(`Warning: Dependency depth exceeds ${MAX_DEPTH}, possible cycle or deep graph`);
          break;
        }

        const frame = stack[stack.length - 1];
        const node = frame.name;
        const nodeState = state.get(node) || 0;

        if (nodeState === 0) {
          state.set(node, 1);
          path.push(node);
        }

        if (frame.nextIndex >= frame.deps.length) {
          state.set(node, 2);
          stack.pop();
          path.pop();
          continue;
        }

        const dep = frame.deps[frame.nextIndex++];
        if (!dep || !this._componentByName.has(dep)) {
          continue;
        }

        const depState = state.get(dep) || 0;
        if (depState === 0) {
          stack.push({
            name: dep,
            deps: this.getDependencies(dep).map(d => d.name).filter(Boolean),
            nextIndex: 0
          });
          continue;
        }

        if (depState === 1) {
          const cycleStart = path.indexOf(dep);
          if (cycleStart !== -1) {
            const cycle = path.slice(cycleStart).concat(dep);
            const key = canonicalizeCycle(cycle);
            if (!seenCycles.has(key)) {
              seenCycles.add(key);
              cycles.push(cycle);
            }
          }
        }
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
