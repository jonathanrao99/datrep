# DatRep FastAPI Backend

AI-powered data analysis and insights generation backend for DatRep.

## Features

- **File Upload**: Support for CSV, XLSX, and XLS files
- **Data Analysis**: Automatic parsing and statistical analysis
- **AI Insights**: GPT-powered insights generation using OpenAI
- **Chart Generation**: Chart configuration for EvilCharts
- **Chat with Data**: Interactive Q&A about datasets (Phase 2)
- **MCP Architecture**: Modular Model Context Protocol design

## Quick Start

### Prerequisites

- Python 3.11+
- OpenAI API key
- PostgreSQL database (optional for MVP)

### Installation

1. **Clone and navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your OpenAI API key and other settings
   ```

4. **Run the development server**:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### Using Docker

1. **Build and run with Docker Compose**:
   ```bash
   docker-compose up --build
   ```

2. **Or build and run manually**:
   ```bash
   docker build -t datrep-api .
   docker run -p 8000:8000 --env-file .env datrep-api
   ```

## API Endpoints

### Health Check
- `GET /health` - Service health status

### File Upload
- `POST /api/upload` - Upload CSV/XLSX file
- `GET /api/files/{file_id}` - Get file information
- `DELETE /api/files/{file_id}` - Delete uploaded file
- `GET /api/files` - List all files

### Data Analysis
- `POST /api/analyze` - Full analysis with GPT insights
- `POST /api/analyze/quick` - Quick analysis without GPT
- `GET /api/analyze/{analysis_id}` - Get analysis results

### Charts and Insights
- `POST /api/chart` - Generate chart configuration
- `POST /api/chat` - Chat with data (Phase 2)
- `GET /api/insights/{file_id}` - Get insights for file

## Architecture

### MCP (Model Context Protocol) Modules

- **File System MCP** (`mcp/file_system.py`): File upload, storage, and cleanup
- **OpenAI MCP** (`mcp/openai.py`): GPT integration for insights and chat
- **HTTP MCP** (`mcp/http_client.py`): External API communication
- **Database MCP** (`mcp/database.py`): Database operations (future)

### Services

- **Data Service** (`services/data_service.py`): Data parsing and analysis
- **Chart Service** (`services/chart_service.py`): Chart generation (future)

### Models

- **Schemas** (`models/schemas.py`): Pydantic models for API requests/responses

## Development

### Project Structure
```
backend/
├── mcp/                 # Model Context Protocol modules
├── services/            # Business logic services
├── models/              # Pydantic schemas
├── api/
│   └── routes/          # API route handlers
├── uploads/             # File storage (local)
├── requirements.txt     # Python dependencies
├── Dockerfile          # Docker configuration
├── docker-compose.yml  # Docker Compose setup
└── main.py             # FastAPI application entry point
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `DATABASE_URL` | PostgreSQL connection string | Optional |
| `UPLOAD_DIR` | File upload directory | `./uploads` |
| `MAX_FILE_SIZE` | Maximum file size in bytes | `10485760` (10MB) |
| `ENV` | Environment (development/production) | `development` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000` |

### Testing

The API includes automatic documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Deployment

### Production Considerations

1. **File Storage**: Migrate from local storage to S3 or similar
2. **Database**: Set up PostgreSQL for session and project storage
3. **Rate Limiting**: Implement API rate limiting
4. **Security**: Add authentication and authorization
5. **Monitoring**: Add logging and monitoring

### Environment Setup

1. Set `ENV=production`
2. Configure production database
3. Set up cloud file storage
4. Configure CORS for production domain
5. Set up SSL/TLS certificates

## Contributing

1. Follow the MCP architecture pattern
2. Add proper error handling
3. Include type hints
4. Write tests for new features
5. Update documentation

## License

MIT License - see LICENSE file for details 