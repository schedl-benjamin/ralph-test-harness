import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.static(join(__dirname, "public")));
app.use(express.json());

// Calculator API
app.post("/api/calculate", (req, res) => {
  const { a, b, operation } = req.body as {
    a: number;
    b: number;
    operation: string;
  };

  if (typeof a !== "number" || typeof b !== "number") {
    res.status(400).json({ error: "Both inputs must be numbers" });
    return;
  }

  try {
    let result: number;
    switch (operation) {
      case "add":
        result = a + b;
        break;
      case "subtract":
        result = a - b;
        break;
      case "multiply":
        result = a * b;
        break;
      case "divide":
        if (b === 0) throw new Error("Cannot divide by zero");
        result = a / b;
        break;
      default:
        res.status(400).json({ error: `Unknown operation: ${operation}` });
        return;
    }
    res.json({ result });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Greeter API
app.post("/api/greet", (req, res) => {
  const { name } = req.body as { name: string };
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  res.json({ greeting: `Hello, ${name}!` });
});

app.post("/api/farewell", (req, res) => {
  const { name } = req.body as { name: string };
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  res.json({ farewell: `Goodbye, ${name}!` });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
