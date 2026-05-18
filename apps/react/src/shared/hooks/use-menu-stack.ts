import { useCallback, useMemo } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

const PARAM = "m"

export function useMenuStack() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const stack = useMemo(() => {
    const raw = searchParams.get(PARAM) ?? ""
    return raw ? raw.split(",").filter(Boolean) : []
  }, [searchParams])

  const peek = stack.at(-1) ?? null

  const push = useCallback(
    (id: string) => {
      const current = (searchParams.get(PARAM) ?? "").split(",").filter(Boolean)
      const params = new URLSearchParams(searchParams)
      params.set(PARAM, [...current, id].join(","))
      navigate(`?${params}`, { replace: false })
    },
    [searchParams, navigate],
  )

  const pop = useCallback(() => {
    navigate(-1)
  }, [navigate])

  const popAll = useCallback(() => {
    const params = new URLSearchParams(searchParams)
    params.delete(PARAM)
    const qs = params.toString()
    navigate(qs ? `?${qs}` : ".", { replace: true })
  }, [searchParams, navigate])

  const isOpen = useCallback((id: string) => stack.includes(id), [stack])

  return { stack, push, pop, popAll, peek, isOpen }
}
