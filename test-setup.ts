// Basic test setup for Bun to handle Angular components in unit tests
import { mock } from "bun:test";

console.log("--- TEST SETUP STARTING (Manual) ---");

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

// Minimal DOM mock for xterm and other browser-dependent libs
if (typeof global.window === 'undefined') {
  (global as any).window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
    CustomEvent: class {},
    navigator: { userAgent: 'Bun' },
    location: { href: 'http://localhost' },
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
  };
  (global as any).document = {
    createElement: () => ({
      appendChild: () => ({}),
      style: {},
      classList: { add: () => {}, remove: () => {} },
      addEventListener: () => {},
      removeEventListener: () => {},
      ownerDocument: { defaultView: (global as any).window },
    }),
    body: { appendChild: () => ({}), style: { tabSize: '4', MozTabSize: '4' } },
    addEventListener: () => {},
    removeEventListener: () => {},
    documentElement: { style: { tabSize: '4', MozTabSize: '4' } },
    head: { appendChild: () => ({}) },
  };
  (global as any).navigator = (global as any).window.navigator;
  (global as any).Node = class {};
  (global as any).Element = class {};
  (global as any).HTMLElement = class {};
  (global as any).HTMLDivElement = class {};
  (global as any).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
}

const noop = (name: string) => {
  return () => () => { /* noop */ };
};

// Mock Angular Core
console.log("Registering @angular/core mock...");
mock.module("@angular/core", () => ({
  Component: noop("Component"),
  Directive: noop("Directive"),
  Pipe: noop("Pipe"),
  Injectable: noop("Injectable"),
  NgModule: noop("NgModule"),
  Input: noop("Input"),
  Output: noop("Output"),
  ViewChild: noop("ViewChild"),
  ViewChildren: noop("ViewChildren"),
  ContentChild: noop("ContentChild"),
  ContentChildren: noop("ContentChildren"),
  HostBinding: noop("HostBinding"),
  HostListener: noop("HostListener"),
  Inject: noop("Inject"),
  inject: (_token: any) => {
    const mockObservable = (data: any) => ({
      subscribe: (observer: any) => {
        const callback = typeof observer === 'function' ? observer : observer.next;
        if (callback) callback(data);
        return { unsubscribe: () => {} };
      },
      pipe: () => mockObservable(data)
    });

    return { 
      subscribe: (observer: any) => ({ unsubscribe: () => {} }),
      pipe: () => ({ subscribe: (observer: any) => ({}) }),
      getFiles: () => mockObservable({ name: '.', path: '.', children: [] }),
      readFile: () => mockObservable('mock content'),
      getChildren: () => mockObservable([]),
      getWorkspace: () => mockObservable({ path: '.' }),
      setWorkspace: () => mockObservable(undefined),
      writeFile: () => mockObservable(undefined),
      openWorkspace: () => {},
      selectFolder: () => Promise.resolve('/mock/path'),
      connect: () => Promise.resolve(),
      onData$: mockObservable(''),
    };
  },
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
  PLATFORM_ID: "platform_id",
  signal: (val: any) => {
    let value = val;
    const s: any = () => value;
    s.set = (v: any) => { value = v; };
    s.update = (fn: any) => { value = fn(value); };
    s.asReadonly = () => () => value;
    return s;
  },
  computed: (fn: any) => () => fn(),
  effect: (_fn: any) => { /* noop */ },
  untracked: (fn: any) => fn(),
  resource: (_opts: any) => ({}),
  rxResource: (_opts: any) => ({}),
  runInInjectionContext: (_ctx: any, fn: any) => fn(),
  input: Object.assign(
    (val: any) => {
      const s: any = () => val;
      s.required = () => s;
      return s;
    },
    { required: () => { const s: any = () => undefined; s.asReadonly = () => s; return s; } }
  ),
  booleanAttribute: (v: any) => v === '' || v === true || v === 'true',
  numberAttribute: (v: any) => v === undefined ? NaN : Number(v),
  output: () => ({ emit: (_v: any) => { /* noop */ }, subscribe: (_cb: any) => ({ unsubscribe: () => { /* noop */ } }) }),
  viewChild: Object.assign(
    (_selector: any) => ({ nativeElement: {} }),
    { required: (_selector: any) => ({ nativeElement: {} }) }
  ),
  viewChildren: () => ([]),
  afterNextRender: (fn: any) => fn(),
  afterRender: (fn: any) => fn(),
  ChangeDetectorRef: class { markForCheck() {} detectChanges() {} },
  Renderer2: class {},
  ElementRef: class { constructor(_el: any) {} },
  Injector: { get: () => ({}) },
  ViewEncapsulation: { None: 0, Emulated: 1, ShadowDom: 2 },
  ChangeDetectionStrategy: { OnPush: 0, Default: 1 },
  NgZone: class { run(fn: any) { return fn(); } runOutsideAngular(fn: any) { return fn(); } },
  DOCUMENT: "document",
  DestroyRef: class { onDestroy(_fn: any) {} },
  PendingTasks: class { add() { return () => {}; } },
  VERSION: { major: "21" },
  Version: class {},
  ɵisPromise: (v: any) => v && typeof v.then === 'function',
  ɵisSubscribable: (v: any) => v && typeof v.subscribe === 'function',
  ɵRuntimeError: class extends Error {},
  ɵformatRuntimeError: (c: any, m: any) => m,
  ɵsetClassMetadata: () => {},
  ɵɵdefineComponent: () => ({}),
  ɵɵdefineDirective: () => ({}),
  ɵɵdefineInjectable: () => ({}),
  ɵɵdefineNgModule: () => ({}),
  ɵɵdefinePipe: () => ({}),
  ɵɵdirectiveInject: () => ({}),
  ɵɵinject: () => ({}),
  ɵConsole: class { log() {} warn() {} error() {} },
  ɵTracingService: class {},
  ɵperformanceMarkFeature: () => [],
  ɵtruncateMiddle: (v: any) => v,
  ɵencapsulateResourceError: (e: any) => e,
}));

console.log("Registering @angular/common mock...");
mock.module("@angular/common", () => ({
  CommonModule: class {},
  NgIf: class {},
  NgFor: class {},
  NgClass: class {},
  NgStyle: class {},
  DOCUMENT: "document",
  isPlatformBrowser: () => true,
  isPlatformServer: () => false,
  ɵgetDOM: () => ({}),
}));

console.log("Registering rxjs mock...");
import { BehaviorSubject, Subject, Observable, Subscription, of, from, firstValueFrom, lastValueFrom } from "rxjs";
mock.module("rxjs", () => ({
  BehaviorSubject,
  Subject,
  Observable,
  Subscription,
  of,
  from, 
  firstValueFrom,
  lastValueFrom,
  map: (fn: any) => (source: any) => source,
  filter: (fn: any) => (source: any) => source,
  tap: (fn: any) => (source: any) => source,
  switchMap: (fn: any) => (source: any) => source,
  catchError: (fn: any) => (source: any) => source,
  throwError: (fn: any) => of(fn()),
  EMPTY: of(null),
  takeUntil: () => (source: any) => source,
  finalize: () => (source: any) => source,
  delay: () => (source: any) => source,
}));

console.log("Registering @vertex/ui mock...");
mock.module("@vertex/ui", () => ({
  MainLayoutComponent: class {},
  EditorComponent: class {},
  SidebarComponent: class {},
  BottomPanelComponent: class {},
  TabsComponent: class {},
}));

console.log("Registering primeng mocks...");
const mockModule = class {};
mock.module("primeng/api", () => ({
  ConfirmationService: class {},
  MessageService: class {},
  TreeNode: class {},
  SharedModule: mockModule,
}));
mock.module("primeng/splitter", () => ({ SplitterModule: mockModule }));
mock.module("primeng/toolbar", () => ({ ToolbarModule: mockModule }));
mock.module("primeng/tree", () => ({ TreeModule: mockModule }));
mock.module("primeng/divider", () => ({ DividerModule: mockModule }));
mock.module("primeng/tabs", () => ({ TabsModule: mockModule }));

mock.module("xterm", () => ({ 
  Terminal: class { 
    loadAddon() {} open() {} dispose() {} onData() { return { dispose: () => {} }; } write() {} 
    cols = 80; rows = 24; 
  } 
}));
mock.module("xterm-addon-fit", () => ({ FitAddon: class { fit() {} } }));
mock.module("xterm-addon-webgl", () => ({ WebglAddon: class {} }));

console.log("Mocking @tauri-apps/api...");
mock.module("@tauri-apps/api/core", () => ({ invoke: async () => ({}) }));
mock.module("@tauri-apps/api/event", () => ({ listen: async () => (() => {}), emit: async () => ({}) }));

console.log("Mocking @vertex/core terminal tokens...");
mock.module("@vertex/core", () => ({
  TERMINAL_BACKEND_ADAPTER: "TERMINAL_BACKEND_ADAPTER",
  FileService: class {
    getFiles() { return of({ name: '.', children: [] }); }
    readFile() { return of(''); }
    getChildren() { return of([]); }
    getWorkspace() { return of({ path: '.' }); }
    setWorkspace() { return of(undefined); }
    writeFile() { return of(undefined); }
  },
  TauriTerminalService: class { connect() { return Promise.resolve(); } onData$ = of(''); },
  WebTerminalService: class { connect() { return Promise.resolve(); } onData$ = of(''); },
  VirtualTerminalService: class { connect() { return Promise.resolve(); } onData$ = of(''); },
  MockTerminalService: class { connect() { return Promise.resolve(); } onData$ = of(''); },
  TauriService: class { selectFolder() { return Promise.resolve('/mock/path'); } },
  WorkspaceService: class { openWorkspace() {} },
  PreferencesService: class {},
  ConfigService: class {},
  RuntimeService: class {},
  TerminalPanelComponent: class {},
  db: {},
}));

console.log("Mocking @vertex/ide-ui...");
const ideUiStub = class {};
mock.module("@vertex/ide-ui", () => ({
  IdeAlertComponent: ideUiStub,
  IdeButtonComponent: ideUiStub,
  IdeDialogComponent: ideUiStub,
  IdeInputComponent: ideUiStub,
  IdeLayoutComponent: ideUiStub,
  IdeProgressBarComponent: ideUiStub,
  IdeSplitterComponent: ideUiStub,
  IdeTabsComponent: ideUiStub,
  IdeToolbarComponent: ideUiStub,
  IdeTreeComponent: ideUiStub,
  IdeTreeItemComponent: ideUiStub,
  SplitterContainerDirective: ideUiStub,
  SplitterHandleDirective: ideUiStub,
  SplitterPanelDirective: ideUiStub,
  SplitterService: class {},
  DEFAULT_SPLITTER_CONFIG: {},
}));

console.log("Mocking @angular/router...");
mock.module("@angular/router", () => ({
  RouterOutlet: class {},
  RouterLink: class {},
  RouterLinkActive: class {},
  Router: class {},
  ActivatedRoute: class {},
  provideRouter: () => {},
  withComponentInputBinding: () => {},
  withPreloading: () => {},
  PreloadAllModules: class {},
}));

console.log("--- TEST SETUP COMPLETED ---");
