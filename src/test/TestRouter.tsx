import { createContext, useContext, useState, type ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

const ContentContext = createContext<ReactNode>(null)

function Content() {
  return useContext(ContentContext)
}

/** MemoryRouter dạng data router, giống app thật, để dùng được useBlocker trong test. */
export function TestRouter({
  children,
  initialEntries = ['/'],
}: {
  children: ReactNode
  initialEntries?: string[]
}) {
  const [router] = useState(() =>
    createMemoryRouter([{ path: '*', element: <Content /> }], { initialEntries }),
  )
  return (
    <ContentContext.Provider value={children}>
      <RouterProvider router={router} useTransitions={false} />
    </ContentContext.Provider>
  )
}
