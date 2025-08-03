# DatRep - AI-Powered Data Analysis Platform

<div align="center">
  <strong>🚀 Modern AI-powered data analysis platform</strong><br>
  <em>Upload CSV/XLSX files and get instant insights via GPT, charts, and reports</em>
</div>

<br>

<div align="center">
  <a href="#quick-start">Quick Start</a>
  <span> · </span>
  <a href="#features">Features</a>
  <span> · </span>
  <a href="OVERVIEW.md">Full Documentation</a>
</div>

---

## 🎯 **What is DatRep?**

DatRep is a modern, AI-powered data analysis platform that transforms how you interact with your data. Upload CSV/XLSX files (up to 100MB) and receive instant, intelligent insights powered by GPT-4.

### **Key Features**
- 📊 **Smart Data Analysis**: Upload CSV/XLSX files up to 100MB
- 🤖 **AI-Powered Insights**: GPT-4 integration for intelligent analysis
- 📈 **Interactive Charts**: Dynamic visualizations with Recharts
- 💬 **Chat with Data**: Ask questions about your datasets
- 📱 **Responsive Design**: Works on all devices
- 🚀 **Real-time Processing**: Instant analysis and insights

---

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ and npm
- Python 3.11+
- OpenAI API key

### **Installation**

1. **Install dependencies**:
   ```bash
   # Install Node.js dependencies
   npm install
   
   # Install Python dependencies
   pip install -r backend/requirements.txt
   ```

2. **Set up environment**:
   ```bash
   # Copy environment files
   cp .env.example .env
   cp backend/.env.example backend/.env
   
   # Add your OpenAI API key to backend/.env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Start the application**:
   ```bash
   # Use the unified launcher (recommended)
   python start_datrep_unified.py
   ```

4. **Access the application**:
   - 🌐 **Frontend**: http://localhost:3000
   - 📊 **Backend**: http://localhost:8000
   - 📚 **API Docs**: http://localhost:8000/docs

---

## 🎨 **User Experience**

### **Workflow**
1. **Upload Data**: Drag-and-drop CSV/XLSX files (up to 100MB)
2. **Auto-Analysis**: Instant AI-powered insights and statistics
3. **Explore Insights**: View detailed analysis with charts and recommendations
4. **Chat with Data**: Ask questions about your dataset
5. **Export Results**: Download reports and visualizations

### **Sample AI Insights**
```
🎵 Highest Sales: Samsung Galaxy leads with 1.2M units sold!
💰 Revenue Champion: MacBook Pro generates $1.6B despite lower sales!
⚡ Pattern Discovery: Higher-priced items generate more revenue per unit!
📈 Growth Trend: Sales increase by 15% month-over-month!
```

---

## 🏗️ **Architecture**

### **Tech Stack**
- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI (Python) with OpenAI integration and Pandas
- **AI**: OpenAI GPT-4o-mini for intelligent analysis
- **Charts**: Recharts for data visualization

### **System Architecture**
```
Frontend (Next.js) ←→ Backend (FastAPI) ←→ OpenAI API
     ↓                    ↓
  Shadcn UI         Pandas/CSV Processing
  Recharts          File Storage (Local)
  TypeScript        AI Analysis Engine
```

---

## 📚 **Documentation**

For comprehensive documentation, including:
- Detailed setup instructions
- API documentation
- Development guidelines
- Architecture details
- Future roadmap

**📖 [Read the Full Documentation](OVERVIEW.md)**

---

## 🎯 **Current Status**

### **✅ Completed Features**
- **Premium UI/UX**: Professional, clean design with excellent user experience
- **File Upload**: Drag-and-drop interface with validation (up to 100MB)
- **Analysis Dashboard**: Comprehensive view with tabs, insights, and charts
- **Chat Interface**: Interactive AI chat for data questions
- **Responsive Design**: Works beautifully on all devices
- **Enhanced AI**: Specific, engaging insights based on actual data

### **🚀 Recent Improvements**
- **Enhanced AI Integration**: Real dataset-specific insights with engaging responses
- **Large File Support**: Up to 100MB file uploads
- **Unified Startup**: Single script to start both frontend and backend
- **Performance Optimization**: 50% reduction in token usage

---

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guidelines](OVERVIEW.md#contributing) in the full documentation.

---

## 📄 **License**

MIT License - see [LICENSE.md](LICENSE.md) for details.

---

**DatRep** is designed to make data analysis accessible, engaging, and powerful for everyone. The combination of modern web technologies, AI integration, and user-focused design creates a platform that transforms how people interact with their data.

*Built with ❤️ using Next.js, FastAPI, and OpenAI*
