const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

interface RequestOptions extends RequestInit {
  token?: string
}

export class ApiError extends Error {
  status: number
  data: any

  constructor(message: string, status: number, data?: any) {
    super(message)
    this.status = status
    this.data = data
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const token = options.token || (typeof window !== "undefined" ? localStorage.getItem("auth_token") : null)

  const headers = new Headers(options.headers || {})
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const res = await fetch(url, {
    ...options,
    headers,
  })

  let data: any
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    let errorMsg = `Request failed with status ${res.status}`
    if (typeof data?.detail === "string") {
      errorMsg = data.detail
    } else if (Array.isArray(data?.detail)) {
      errorMsg = data.detail
        .map((item: any) => {
          if (typeof item === "string") return item
          const loc = Array.isArray(item?.loc) ? item.loc.slice(1).join(".") : ""
          const msg = item?.msg || JSON.stringify(item)
          return loc ? `${loc}: ${msg}` : msg
        })
        .join(", ")
    } else if (typeof data?.message === "string") {
      errorMsg = data.message
    } else if (typeof data?.error === "string") {
      errorMsg = data.error
    }
    throw new ApiError(errorMsg, res.status, data)
  }

  return data
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
}
