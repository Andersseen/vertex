// Basic test setup for Bun to handle Angular components in unit tests
import { mock } from "bun:test";

console.log("--- TEST SETUP STARTING ---");

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

const noop = (name: string) => {
  // console.log(`Mocking decorator/symbol: ${name}`);
  return () => () => { /* noop */ };
};

// Mock Angular Core to avoid JIT decorator errors
console.log("Registering @angular/core mock...");
mock.module("@angular/core", () => ({
  Component: noop("Component"),
  Directive: noop("Directive"),
  Pipe: noop("Pipe"),
  Injectable: noop("Injectable"),
  Input: noop("Input"),
  Output: noop("Output"),
  ViewChild: noop("ViewChild"),
  ViewChildren: noop("ViewChildren"),
  ContentChild: noop("ContentChild"),
  ContentChildren: noop("ContentChildren"),
  HostBinding: noop("HostBinding"),
  HostListener: noop("HostListener"),
  NgModule: noop("NgModule"),
  signal: (val: any) => {
    const s: any = () => val;
    s.set = (_v: any) => { /* noop */ };
    s.update = (_fn: any) => { /* noop */ };
    s.asReadonly = () => s;
    return s;
  },
  computed: (fn: any) => (() => fn()),
  effect: (_fn: any) => { /* noop */ },
  Inject: noop("Inject"),
  inject: (_token: any) => ({}),
  Optional: noop("Optional"),
  Self: noop("Self"),
  SkipSelf: noop("SkipSelf"),
  Host: noop("Host"),
  forwardRef: (fn: any) => fn(),
  EventEmitter: class {
    emit(_val?: any) { /* noop */ }
    subscribe(_cb: any) { return { unsubscribe: () => { /* noop */ } }; }
  },
  InjectionToken: class { constructor(_name: string) { /* noop */ } },
  provideAppInitializer: (_fn: any) => ({}),
  PLATFORM_ID: "platform_id",
  makeEnvironmentProviders: (_providers: any[]) => ({}),
  untracked: (fn: any) => fn(),
  resource: (_opts: any) => ({}),
  rxResource: (_opts: any) => ({}),
  runInInjectionContext: (_ctx: any, fn: any) => fn(),
  input: (val: any) => {
    const s: any = () => val;
    s.required = () => s;
    return s;
  },
  output: () => ({ emit: (_v: any) => { /* noop */ }, subscribe: (_cb: any) => ({ unsubscribe: () => { /* noop */ } }) }),
  viewChild: () => ({}),
  viewChildren: () => ({}),
  contentChild: () => ({}),
  contentChildren: () => ({}),
  ChangeDetectorRef: class {
    markForCheck() { /* noop */ }
    detectChanges() { /* noop */ }
  },
  Renderer2: class { /* noop */ },
  ElementRef: class { constructor(_el: any) { /* noop */ } },
  Injector: {
    create: (_opts: any) => ({ get: (_t: any) => ({}) }),
    get: (_t: any) => ({})
  },
  ViewEncapsulation: { None: 0, Emulated: 1, ShadowDom: 2 },
  ChangeDetectionStrategy: { OnPush: 0, Default: 1 },
  Attribute: noop("Attribute"),
  NgZone: class {
    run(fn: any) { return fn(); }
    runOutsideAngular(fn: any) { return fn(); }
  },
  TemplateRef: class { /* noop */ },
  ViewContainerRef: class { /* noop */ },
  QueryList: class {
    map(fn: any) { return []; }
    forEach(fn: any) { /* noop */ }
    toArray() { return []; }
  },
  booleanAttribute: (v: any) => !!v,
  numberAttribute: (v: any) => Number(v),
  afterNextRender: (fn: any) => fn(),
  afterRender: (fn: any) => fn(),
  TERMINAL_BACKEND_ADAPTER: class { constructor(_name: string) { /* noop */ } },
  TauriTerminalService: class { connect() { return Promise.resolve(); } onData$ = { pipe: () => ({ subscribe: () => ({}) }) }; },
  WebTerminalService: class { connect() { return Promise.resolve(); } onData$ = { pipe: () => ({ subscribe: () => ({}) }) }; },
}));

console.log("Registering @vertex/ui mock...");
mock.module("@vertex/ui", () => ({
  MainLayoutComponent: class { /* noop */ },
  EditorComponent: class { /* noop */ },
  SidebarComponent: class { /* noop */ },
  BottomPanelComponent: class { /* noop */ },
  TabsComponent: class { /* noop */ },
}));

console.log("Registering @angular/common mock...");
mock.module("@angular/common", () => ({
  CommonModule: class { /* noop */ },
  NgIf: class { /* noop */ },
  NgFor: class { /* noop */ },
  NgClass: class { /* noop */ },
  NgStyle: class { /* noop */ },
  DOCUMENT: "document",
  isPlatformBrowser: (_id: any) => true,
  isPlatformServer: (_id: any) => false,
}));

console.log("Registering rxjs mock...");
mock.module("rxjs", () => ({
  BehaviorSubject: class {
    value: any;
    constructor(val: any) { this.value = val; }
    next(val: any) { this.value = val; }
    asObservable() { return this; }
    subscribe(_cb: any) { return { unsubscribe: () => { /* noop */ } }; }
    pipe() { return this; }
  },
  Observable: class {
    subscribe(_cb: any) { return { unsubscribe: () => { /* noop */ } }; }
    pipe() { return this; }
  },
  Subject: class {
    next(_val: any) { /* noop */ }
    asObservable() { return this; }
    subscribe(_cb: any) { return { unsubscribe: () => { /* noop */ } }; }
    pipe() { return this; }
  },
  Subscription: class {
    unsubscribe() { /* noop */ }
    add(_sub: any) { /* noop */ }
  },
  of: (val: any) => ({ subscribe: (cb: any) => cb(val), pipe: () => ({ subscribe: (cb: any) => cb(val) }) }),
  takeUntil: (_notifier: any) => (source: any) => source,
}));

console.log("Registering primeng mocks...");
const mockModule = class { /* noop */ };
mock.module("primeng/api", () => ({
  ConfirmationService: class { /* noop */ },
  MessageService: class { /* noop */ },
  TreeNode: class { /* noop */ },
  SharedModule: mockModule,
}));
mock.module("primeng/splitter", () => ({ SplitterModule: mockModule }));
mock.module("primeng/toolbar", () => ({ ToolbarModule: mockModule }));
mock.module("primeng/tree", () => ({ TreeModule: mockModule }));
mock.module("primeng/divider", () => ({ DividerModule: mockModule }));
mock.module("primeng/tabs", () => ({ TabsModule: mockModule }));
mock.module("xterm", () => ({ 
  Terminal: class { 
    loadAddon() { /* noop */ }
    open() { /* noop */ }
    dispose() { /* noop */ }
    onData() { return { dispose: () => { /* noop */ } }; }
    write() { /* noop */ }
    cols = 80;
    rows = 24;
  } 
}));
mock.module("xterm-addon-fit", () => ({ FitAddon: class { fit() { /* noop */ } } }));
mock.module("xterm-addon-webgl", () => ({ WebglAddon: class { /* noop */ } }));

console.log("Mocking @tauri-apps/api...");
mock.module("@tauri-apps/api/core", () => ({ invoke: async () => ({}) }));
mock.module("@tauri-apps/api/event", () => ({ 
  listen: async () => (() => { /* unlisten noop */ }),
  emit: async () => ({})
}));

console.log("Mocking @vertex/core terminal tokens...");
// We need to extend the @vertex/core mock or add it here if not fully covered
// But actually it's already mocked at line 16 (for core)
// Let's add the terminal tokens to it.

console.log("--- TEST SETUP COMPLETED ---");
