#!/bin/bash

# Git 히스토리에서 큰 파일 제거 스크립트

echo "Git 히스토리에서 큰 파일 제거"
echo "=============================="
echo ""

cd /Users/han/dev/firebird_api_v2

# 방법 1: git filter-branch 사용 (Git 2.22 이하)
if git --version | grep -q "git version 2\.[0-9]\|git version 1\."; then
    echo "git filter-branch를 사용하여 큰 파일 제거 중..."
    git filter-branch --force --index-filter \
        "git rm --cached --ignore-unmatch -r Db/" \
        --prune-empty --tag-name-filter cat -- --all
else
    # 방법 2: git filter-repo 사용 (권장, 더 빠름)
    if command -v git-filter-repo > /dev/null 2>&1; then
        echo "git filter-repo를 사용하여 큰 파일 제거 중..."
        git filter-repo --path Db/ --invert-paths --force
    else
        # 방법 3: BFG Repo-Cleaner 사용
        echo "BFG Repo-Cleaner를 사용하여 큰 파일 제거 중..."
        if command -v bfg > /dev/null 2>&1; then
            bfg --delete-folders Db
        else
            echo "⚠️  git filter-repo 또는 BFG가 설치되어 있지 않습니다."
            echo ""
            echo "수동으로 제거하는 방법:"
            echo ""
            echo "1. 새로운 브랜치 생성:"
            echo "   git checkout --orphan new-main"
            echo "   git add ."
            echo "   git commit -m 'Initial commit without large files'"
            echo "   git branch -D main"
            echo "   git branch -m main"
            echo "   git push -f origin main"
            echo ""
            echo "또는"
            echo ""
            echo "2. git filter-branch 설치 후 실행:"
            echo "   git filter-branch --force --index-filter \\"
            echo "       'git rm --cached --ignore-unmatch -r Db/' \\"
            echo "       --prune-empty --tag-name-filter cat -- --all"
            exit 1
        fi
    fi
fi

echo ""
echo "✓ 큰 파일 제거 완료"
echo ""
echo "다음 단계:"
echo "1. git push -f origin main (force push 필요)"
echo "2. 팀원들에게 알림 (모든 사람이 새 히스토리로 재클론 필요)"

