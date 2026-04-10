import OpenAI from "openai";

const client = new OpenAI();

export default async function Page() {
  const response = await client.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: "Hello" }],
  });
  return <div>AI Response: {response.choices[0]?.message?.content}</div>;
}
