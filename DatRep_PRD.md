# DatRep - AI-Powered Data Analysis Platform

## 🎯 **Project Overview**

**DatRep** is a modern, AI-powered data analysis platform that allows users to upload CSV/XLSX files and receive instant insights via GPT, interactive charts, and downloadable reports. Built with a focus on user experience and powerful AI integration.

### **Key Features**
- 📊 **Smart Data Analysis**: Upload CSV/XLSX files up to 100MB
- 🤖 **AI-Powered Insights**: GPT-4 integration for intelligent analysis
- 📈 **Interactive Charts**: Dynamic visualizations with Recharts
- 💬 **Chat with Data**: Ask questions about your datasets
- 📱 **Responsive Design**: Works on all devices
- 🚀 **Real-time Processing**: Instant analysis and insights

---

## 🏗️ **Architecture**

### **Tech Stack**
- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI (Python) with OpenAI integration and Pandas
- **AI**: OpenAI GPT-4o-mini for intelligent analysis
- **Charts**: Recharts for data visualization
- **Storage**: Local file storage with PostgreSQL planned

### **System Architecture**
```text
Frontend (Next.js) ←→ Backend (FastAPI) ←→ OpenAI API
     ↓                    ↓
  Shadcn UI         Pandas/CSV Processing
  Recharts          File Storage (Local)
  TypeScript        AI Analysis Engine
```

---

## 🎨 **Design System**

### **Color Theme**
- Primary: `#4F46E5` (Indigo)
- Accent: `#84CC16` (Lime Green)
- Background: `#F9FAFB` (Warm Gray)
- Alert: `#FB923C` (Orange), `#EF4444` (Red)
- Dark Mode Supported: Uses `class="dark"`

### **Typography**
- Font Family: `Inter`, sans-serif
- Headings: Bold, 1.2x line-height, responsive sizing
- Body: Medium weight, `text-base` or `text-sm`

### **UI Components**
- Built with [Shadcn UI](https://ui.shadcn.com)
- Alerts, tabs, toasts, file uploader, dialog modals
- Accessible, composable, and responsive by default

```tsx
<Button variant="outline" className="bg-indigo-600 text-white hover:bg-indigo-700">
  Upload Dataset
</Button>
```

---

## 🧠 **AI Analysis Engine**

### **Prompt Engineering**
- GPT prompt structure includes:
  - Data summary (rows, columns, types)
  - Sample data rows
  - Explicit JSON format instructions
  - Confidence levels (high/medium/low)

```python
prompt = f"""
You are a data analyst. Analyze this dataset:
Summary:
- Rows: {summary['rows']}
- Columns: {summary['columns']}
- Column Names: {summary['column_names']}

Sample:
{sample_data}

Return JSON:
{{
  "insights": [...],
  "patterns": [...],
  "data_quality": {{}}
}}
"""
```

### **Dynamic Timestamp**
```python
from datetime import datetime
generated_at = datetime.utcnow().isoformat() + "Z"
```

### **Token Optimization**
- Uses `GPT-4o-mini` (faster & cheaper)
- Reduces sample size if over 3,000 chars
```python
if len(sample_data) > 3000:
    sample_data = sample_data[:3000] + "\n... (truncated)"
```

---

## 📂 **Backend Folder Structure**
```
backend/
├── mcp/                    # Model Context Protocol
│   ├── file_system.py      # File handling
│   └── openai.py           # GPT integration
├── services/
│   └── data_service.py     # Pandas data processing
├── models/
│   └── schemas.py          # Pydantic models
├── api/routes/
│   ├── upload.py
│   ├── analyze.py
│   └── insights.py
├── uploads/
├── test_server.py
├── requirements.txt
└── README.md
```

---

## 🧪 **Testing Snippets**

### **FastAPI Test Server Example**
```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
def read_health():
    return {"status": "ok"}
```

### **Frontend API Request**
```ts
const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  return response.json();
};
```

---

## 🔭 **Next Steps**
- [ ] Integrate PostgreSQL and Prisma for session history
- [ ] Add downloadable PDF/Excel reports from insights
- [ ] Implement auth using NextAuth + GitHub/Google
- [ ] Allow users to save and share insight reports

---

## 📝 **Conclusion**

DatRep combines a fast frontend, scalable backend, and AI analytics into a powerful yet user-friendly platform for making data insights accessible to everyone.

*Built with ❤️ using Next.js, FastAPI, and OpenAI*


---

## 🧠 OpenAI MCP – Detailed Integration

The `openai.py` MCP module in `backend/mcp` is designed to generate data insights and answer natural language questions about datasets.

### 📁 File: `backend/mcp/openai.py`
```python
from openai import OpenAI
from fastapi import HTTPException
import os, json

class OpenAIMCP:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY required")
        self.client = OpenAI(api_key=api_key)
        self.model = "gpt-4o"

    async def generate_insights(self, data_summary, sample_data):
        prompt = self._create_insights_prompt(data_summary, sample_data)
        response = await self._call_gpt(prompt)
        return self._parse_insights_response(response)

    def _create_insights_prompt(self, summary, data):
        return f"""
You are a professional data analyst...
Summary: {summary}
Sample Data: {data}
"""

    async def _call_gpt(self, prompt):
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a data analyst."},
                {"role": "user", "content": prompt}
            ]
        )
        return response.choices[0].message.content
```

---

## 🧪 Backend API Example – Upload & Analyze

### `upload.py`:
```python
@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # Save file to local uploads dir
    ...
    return {"filename": saved_name}
```

### `analyze.py`:
```python
@router.post("/analyze")
async def analyze(file_id: str):
    # Load file, parse it with pandas, send summary to OpenAI
    ...
    return {"insights": insights, "summary": data_summary}
```

---

## 📦 Sample `.env.example` for Backend

```env
OPENAI_API_KEY=sk-xxxxxx
UPLOAD_DIR=./uploads
DATABASE_URL=postgresql://user:password@localhost/datrep
MAX_FILE_SIZE=104857600
```

---

## 📈 Sample Frontend Chart Rendering (Recharts)

```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

const Chart = ({ data }) => (
  <LineChart width={600} height={300} data={data}>
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />
    <Line type="monotone" dataKey="sales" stroke="#4F46E5" />
  </LineChart>
);
```

---

## 🔄 File Upload in Frontend (React)

```tsx
const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });
  return await res.json();
};
```

---

## 📌 Suggested Folder Structure Recap

```
backend/
├── api/routes/         # upload.py, analyze.py
├── mcp/                # openai.py, file_system.py
├── services/           # data_service.py
├── uploads/            # stores files
└── main.py
```

```
frontend/
├── components/
│   ├── UploadForm.tsx
│   ├── InsightCard.tsx
│   └── ChartViewer.tsx
├── pages/
│   ├── dashboard.tsx
│   └── api/
│       └── proxy-upload.ts
└── utils/
    └── api.ts
```

---

## 🔧 Local Dev: Unified Startup Script

```python
# start_datrep_unified.py
import subprocess
import threading

def start_backend():
    subprocess.run(["uvicorn", "backend.main:app", "--reload"])

def start_frontend():
    subprocess.run(["npm", "run", "dev"])

threading.Thread(target=start_backend).start()
threading.Thread(target=start_frontend).start()
```

---

