import shutil
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter()

@router.post("/admin/upload")
async def upload_image(file: UploadFile = File(...)):
    # 简单的文件验证
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "仅支持上传图片")

    # 生成唯一文件名防止覆盖
    extension = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{extension}"
    file_path = f"static/uploads/{filename}"

    # 保存文件到本地
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(500, f"文件保存失败: {e}")

    # 返回可访问的 URL (假设后端运行在 localhost:8000)
    # 生产环境中这里可能需要返回完整的域名
    return {"url": f"http://localhost:8000/{file_path}"}