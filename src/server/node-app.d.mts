export function createNodeMvp(options:{dataDir:string;mode?:'operational'|'simulation';clock?:()=>Date}):{close:()=>void;fetch:(request:Request)=>Promise<Response>};
