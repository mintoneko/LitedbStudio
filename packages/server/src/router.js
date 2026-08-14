/**
 * Ultra-lightweight REST Router with dynamic route params support
 */
export class Router {
  constructor() {
    this.routes = [];
  }

  get(path, ...handlers) {
    this.addRoute('GET', path, handlers);
  }

  post(path, ...handlers) {
    this.addRoute('POST', path, handlers);
  }

  put(path, ...handlers) {
    this.addRoute('PUT', path, handlers);
  }

  delete(path, ...handlers) {
    this.addRoute('DELETE', path, handlers);
  }

  options(path, ...handlers) {
    this.addRoute('OPTIONS', path, handlers);
  }

  addRoute(method, path, handlers) {
    const keys = [];
    // Convert path pattern like /api/collections/:name/:id to regex
    const regexStr = path.replace(/:([a-zA-Z0-9_]+)/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    });
    const regex = new RegExp(`^${regexStr}$`);

    this.routes.push({
      method: method.toUpperCase(),
      path,
      regex,
      keys,
      handlers
    });
  }

  match(method, pathname) {
    const upperMethod = method.toUpperCase();
    for (const route of this.routes) {
      if (route.method !== upperMethod) continue;
      const match = pathname.match(route.regex);
      if (match) {
        const params = {};
        for (let i = 0; i < route.keys.length; i++) {
          params[route.keys[i]] = decodeURIComponent(match[i + 1]);
        }
        return {
          handlers: route.handlers,
          params
        };
      }
    }
    return null;
  }
}
