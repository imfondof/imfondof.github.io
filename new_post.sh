#!/bin/bash


file_path=$1
if [ "$file_path" = "" ]; then
	read -p "file_name: " file_path
fi

if [ "$file_path" = "" ]; then echo "文件名不能为空!"; exit; fi
if [ "${file_path##*.}" != "md" ]; then echo "文件格式有误: ${file_path##*.}"; exit; fi

if [ -f "$file_path" ]; then echo "文件已存在"; exit; fi

mkdir -p ${file_path%/*}

cat > $file_path << EEE
$file_path
# 

> [lzyprime 博客 (github)](https://lzyprime.github.io)   
> 创建时间：`date "+%Y.%m.%d"`  
> qq及邮箱：2383518170  

---

## λ：


EEE


