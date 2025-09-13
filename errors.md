## Error Type
Console Error

## Error Message
A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:

- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

https://react.dev/link/hydration-mismatch

  ...
    <RedirectErrorBoundary router={{...}}>
      <InnerLayoutRouter url="/" tree={[...]} cacheNode={{lazyData:null, ...}} segmentPath={[...]}>
        <SegmentViewNode type="page" pagePath="page.tsx">
          <SegmentTrieNode>
          <ClientPageRoot Component={function Home} searchParams={{}} params={{}}>
            <Home params={Promise} searchParams={Promise}>
              <main className="w-full min...">
                <Header>
                  <header className="fixed w-fu...">
                    <div className="max-w-7xl ...">
                      <div className="flex items...">
                        <LinkComponent>
                        <nav className="hidden lg:...">
                          <div className="relative g...">
                            <button
                              onClick={function onClick}
                              className="flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-blue-600 ..."
-                             fdprocessedid="m5wlcx"
                            >
                            ...
                          <div className="relative g...">
                            <button
                              onClick={function onClick}
                              className="flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-blue-600 ..."
-                             fdprocessedid="fw7cjmv"
                            >
                            ...
                          ...
                          ...
                        ...
                ...
        ...
      ...



    at button (<anonymous>:null:null)
    at eval (src\components\Header.tsx:149:19)
    at Array.map (<anonymous>:null:null)
    at Header (src\components\Header.tsx:139:24)
    at Home (src\app\page.tsx:34:7)

## Code Frame
  147 |                   </Link>
  148 |                 ) : (
> 149 |                   <button
      |                   ^
  150 |                     onClick={() => setOpenDropdown(openDropdown === item.title ? null : item.title)}
  151 |                     className="flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm font-medium"
  152 |                   >

Next.js version: 15.5.2 (Webpack)



