import React from 'react';

const paths = {
 fragile: <><path d="M7 3h10l1 6a6 6 0 0 1-12 0l1-6ZM12 15v6M8 21h8M13 3l-2 5 3 1-2 5"/></>,
 heavy: <><path d="M5 8h14l3 13H2L5 8Z"/><circle cx="12" cy="5" r="3"/><path d="M9 12v5M15 12v5M9 14.5h6"/></>,
 dice: <><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="7.5" cy="7.5" r="1"/><circle cx="16.5" cy="7.5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="7.5" cy="16.5" r="1"/><circle cx="16.5" cy="16.5" r="1"/></>,
 box: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5"/></>,
 settings: <><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/></>,
 label: <><path d="M3 3h8l10 10-8 8L3 11V3Z"/><circle cx="7.5" cy="7.5" r="1"/></>,
 edit: <><path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14l-1 7Z"/></>,
 search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
 plus: <path d="M12 5v14M5 12h14"/>,
 lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
};
export function Icon({name}:{name:keyof typeof paths}){
 return <svg className="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
