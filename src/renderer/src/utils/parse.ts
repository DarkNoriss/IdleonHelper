export const parse = (data: string): unknown => {
  try {
    return JSON.parse(data)
  } catch (error) {
    console.error("Failed to parse JSON", error)
    return data
  }
}
