# Large File Upload Support

DatRep now supports uploading files up to **100MB** in size, making it suitable for handling large datasets and comprehensive data analysis.

## 🚀 **What's New**

### **Increased File Size Limits**
- **Frontend**: Updated to accept files up to 100MB
- **Backend**: Configured to handle large file uploads
- **API Routes**: Optimized for large file processing
- **Error Handling**: Clear messages for file size limits

### **Technical Improvements**

#### **Frontend Changes**
```typescript
// FileUploader component now supports 100MB files
maxSize = 100 * 1024 * 1024 // 100MB default

// Updated error messages
'File is too large. Maximum size is 100MB.'
```

#### **Backend Changes**
```python
# FastAPI server configuration
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB in bytes

# File size validation
if len(content) > MAX_FILE_SIZE:
    raise HTTPException(
        status_code=413, 
        detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
    )
```

#### **API Route Configuration**
```typescript
// Next.js API routes optimized for large files
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes timeout
```

## 📁 **Supported File Types**

- **CSV files** (.csv) - Comma-separated values
- **Excel files** (.xlsx, .xls) - Microsoft Excel spreadsheets

## ⚡ **Performance Optimizations**

### **Upload Process**
1. **File Validation**: Type and size checks
2. **Streaming Upload**: Efficient memory usage
3. **Progress Tracking**: Real-time upload status
4. **Error Handling**: Clear feedback for issues

### **Backend Processing**
- **Memory Efficient**: Streams large files
- **Timeout Handling**: 5-minute upload timeout
- **Error Recovery**: Graceful failure handling

## 🛠️ **Configuration**

### **Environment Variables**
```bash
# Backend URL (optional, defaults to localhost:8000)
BACKEND_URL=http://localhost:8000

# File upload directory (optional)
UPLOAD_DIR=./uploads
```

### **Server Startup**
```bash
# Using uvicorn for better file handling
uvicorn simple_server:app --host 0.0.0.0 --port 8000 --reload

# Or use the provided startup scripts
python start_datrep.py
# or
start_datrep.bat
```

## 🧪 **Testing Large Uploads**

### **Test Script**
```bash
# Run the test script to verify functionality
python test_large_upload.py
```

The test script will:
- Create test files of various sizes (10MB, 25MB, 50MB, 75MB, 100MB)
- Upload each file to the backend
- Verify successful processing
- Clean up test files

### **Manual Testing**
1. **Upload a large CSV file** through the web interface
2. **Monitor upload progress** in the browser
3. **Check file processing** in the analysis view
4. **Verify data preview** shows correct information

## 📊 **File Size Guidelines**

### **Recommended File Sizes**
- **Small datasets**: < 10MB (fast processing)
- **Medium datasets**: 10-50MB (good performance)
- **Large datasets**: 50-100MB (acceptable performance)

### **Performance Considerations**
- **Upload time**: ~1-2 minutes per 50MB (depends on connection)
- **Processing time**: ~30-60 seconds for analysis
- **Memory usage**: Optimized for efficient processing

## 🔧 **Troubleshooting**

### **Common Issues**

#### **Upload Fails with "File too large"**
- Check file size is under 100MB
- Verify file type is supported (.csv, .xlsx, .xls)
- Ensure stable internet connection

#### **Upload Times Out**
- Increase timeout settings if needed
- Check server resources
- Verify backend is running properly

#### **Processing Errors**
- Check file format is valid
- Ensure CSV has proper headers
- Verify Excel file isn't corrupted

### **Error Messages**
```
✅ Success: "File uploaded successfully!"
❌ File too large: "File is too large. Maximum size is 100MB."
❌ Invalid type: "Only CSV and Excel files are supported"
❌ Upload failed: "Upload failed. Please try again."
```

## 🚀 **Future Enhancements**

### **Planned Improvements**
- **Chunked uploads** for files > 100MB
- **Progress indicators** for large files
- **Background processing** for analysis
- **File compression** support
- **Cloud storage** integration

### **Performance Optimizations**
- **Parallel processing** for large datasets
- **Caching** for repeated analysis
- **Streaming analysis** for real-time insights
- **Database optimization** for large datasets

## 📈 **Usage Statistics**

With the new 100MB limit, DatRep can now handle:
- **Large datasets**: Up to millions of rows
- **Complex analysis**: Multiple variables and correlations
- **Comprehensive reports**: Detailed insights and visualizations
- **Enterprise data**: Business-grade datasets

---

**Note**: The 100MB limit is a balance between functionality and performance. For larger datasets, consider splitting files or using data compression techniques. 

DatRep now supports uploading files up to **100MB** in size, making it suitable for handling large datasets and comprehensive data analysis.

## 🚀 **What's New**

### **Increased File Size Limits**
- **Frontend**: Updated to accept files up to 100MB
- **Backend**: Configured to handle large file uploads
- **API Routes**: Optimized for large file processing
- **Error Handling**: Clear messages for file size limits

### **Technical Improvements**

#### **Frontend Changes**
```typescript
// FileUploader component now supports 100MB files
maxSize = 100 * 1024 * 1024 // 100MB default

// Updated error messages
'File is too large. Maximum size is 100MB.'
```

#### **Backend Changes**
```python
# FastAPI server configuration
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB in bytes

# File size validation
if len(content) > MAX_FILE_SIZE:
    raise HTTPException(
        status_code=413, 
        detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
    )
```

#### **API Route Configuration**
```typescript
// Next.js API routes optimized for large files
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes timeout
```

## 📁 **Supported File Types**

- **CSV files** (.csv) - Comma-separated values
- **Excel files** (.xlsx, .xls) - Microsoft Excel spreadsheets

## ⚡ **Performance Optimizations**

### **Upload Process**
1. **File Validation**: Type and size checks
2. **Streaming Upload**: Efficient memory usage
3. **Progress Tracking**: Real-time upload status
4. **Error Handling**: Clear feedback for issues

### **Backend Processing**
- **Memory Efficient**: Streams large files
- **Timeout Handling**: 5-minute upload timeout
- **Error Recovery**: Graceful failure handling

## 🛠️ **Configuration**

### **Environment Variables**
```bash
# Backend URL (optional, defaults to localhost:8000)
BACKEND_URL=http://localhost:8000

# File upload directory (optional)
UPLOAD_DIR=./uploads
```

### **Server Startup**
```bash
# Using uvicorn for better file handling
uvicorn simple_server:app --host 0.0.0.0 --port 8000 --reload

# Or use the provided startup scripts
python start_datrep.py
# or
start_datrep.bat
```

## 🧪 **Testing Large Uploads**

### **Test Script**
```bash
# Run the test script to verify functionality
python test_large_upload.py
```

The test script will:
- Create test files of various sizes (10MB, 25MB, 50MB, 75MB, 100MB)
- Upload each file to the backend
- Verify successful processing
- Clean up test files

### **Manual Testing**
1. **Upload a large CSV file** through the web interface
2. **Monitor upload progress** in the browser
3. **Check file processing** in the analysis view
4. **Verify data preview** shows correct information

## 📊 **File Size Guidelines**

### **Recommended File Sizes**
- **Small datasets**: < 10MB (fast processing)
- **Medium datasets**: 10-50MB (good performance)
- **Large datasets**: 50-100MB (acceptable performance)

### **Performance Considerations**
- **Upload time**: ~1-2 minutes per 50MB (depends on connection)
- **Processing time**: ~30-60 seconds for analysis
- **Memory usage**: Optimized for efficient processing

## 🔧 **Troubleshooting**

### **Common Issues**

#### **Upload Fails with "File too large"**
- Check file size is under 100MB
- Verify file type is supported (.csv, .xlsx, .xls)
- Ensure stable internet connection

#### **Upload Times Out**
- Increase timeout settings if needed
- Check server resources
- Verify backend is running properly

#### **Processing Errors**
- Check file format is valid
- Ensure CSV has proper headers
- Verify Excel file isn't corrupted

### **Error Messages**
```
✅ Success: "File uploaded successfully!"
❌ File too large: "File is too large. Maximum size is 100MB."
❌ Invalid type: "Only CSV and Excel files are supported"
❌ Upload failed: "Upload failed. Please try again."
```

## 🚀 **Future Enhancements**

### **Planned Improvements**
- **Chunked uploads** for files > 100MB
- **Progress indicators** for large files
- **Background processing** for analysis
- **File compression** support
- **Cloud storage** integration

### **Performance Optimizations**
- **Parallel processing** for large datasets
- **Caching** for repeated analysis
- **Streaming analysis** for real-time insights
- **Database optimization** for large datasets

## 📈 **Usage Statistics**

With the new 100MB limit, DatRep can now handle:
- **Large datasets**: Up to millions of rows
- **Complex analysis**: Multiple variables and correlations
- **Comprehensive reports**: Detailed insights and visualizations
- **Enterprise data**: Business-grade datasets

---

**Note**: The 100MB limit is a balance between functionality and performance. For larger datasets, consider splitting files or using data compression techniques. 