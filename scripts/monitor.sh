#!/bin/bash

# ========================================
# 📊 夢ログ モニタリングスクリプト
# ========================================
# 
# 目的:
# - リアルタイムシステム監視
# - ヘルスチェック自動実行
# - パフォーマンス診断
# - 問題の早期発見

set -e

# 色付き出力用の定数
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ========================================
# 🛠️ ユーティリティ関数
# ========================================

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}📊 $1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_status() {
    local status=$1
    local message=$2
    
    case $status in
        "OK"|"healthy")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "WARNING"|"degraded")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "ERROR"|"critical")
            echo -e "${RED}❌ $message${NC}"
            ;;
        *)
            echo -e "${CYAN}ℹ️  $message${NC}"
            ;;
    esac
}

# ========================================
# 🩺 ヘルスチェック関数
# ========================================

check_containers() {
    print_header "Docker コンテナ状態確認"
    
    # コンテナの状態を確認
    if docker-compose ps | grep -q "Up"; then
        print_status "OK" "Docker Compose サービスが実行中"
        docker-compose ps
    else
        print_status "ERROR" "Docker Compose サービスが停止中"
        return 1
    fi
    
    echo ""
    
    # 個別コンテナのヘルス状態
    for service in frontend backend db; do
        if docker-compose ps | grep "$service" | grep -q "Up"; then
            health_status=$(docker-compose ps | grep "$service" | awk '{print $4}')
            if [[ $health_status == *"healthy"* ]]; then
                print_status "OK" "$service: 正常動作中"
            elif [[ $health_status == *"starting"* ]]; then
                print_status "WARNING" "$service: 起動中"
            else
                print_status "WARNING" "$service: $health_status"
            fi
        else
            print_status "ERROR" "$service: 停止中"
        fi
    done
}

check_api_endpoints() {
    print_header "API エンドポイント確認"
    
    # バックエンド基本ヘルスチェック
    if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
        print_status "OK" "Backend API: 応答正常"
    else
        print_status "ERROR" "Backend API: 応答なし"
        return 1
    fi
    
    # フロントエンド確認
    if curl -sf http://localhost:3000 > /dev/null 2>&1; then
        print_status "OK" "Frontend: 応答正常"
    else
        print_status "ERROR" "Frontend: 応答なし"
    fi
    
    # 詳細ヘルスチェック（JSON形式で詳細確認）
    echo -e "\n${CYAN}📋 詳細ヘルスチェック結果:${NC}"
    if curl -sf http://localhost:3001/health/detailed 2>/dev/null | jq . 2>/dev/null; then
        echo ""
    else
        echo -e "${YELLOW}⚠️  詳細ヘルスチェックが利用できません${NC}"
    fi
}

check_system_resources() {
    print_header "システムリソース使用状況"
    
    # Docker統計情報
    echo -e "${CYAN}📊 Docker リソース使用状況:${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}" | head -4
    
    echo ""
    
    # ディスク使用量
    echo -e "${CYAN}💽 ディスク使用量:${NC}"
    df -h | grep -E "(Filesystem|/dev/)" | grep -v tmpfs
    
    echo ""
    
    # Docker ボリューム使用量
    echo -e "${CYAN}📦 Docker ボリューム:${NC}"
    docker system df
}

check_logs() {
    print_header "ログ確認"
    
    echo -e "${CYAN}📄 最新エラーログ (最近5件):${NC}"
    
    # バックエンドのエラーログ
    echo -e "\n${PURPLE}Backend エラー:${NC}"
    docker-compose logs backend 2>/dev/null | grep -i error | tail -5 || echo "エラーログなし"
    
    # フロントエンドのエラーログ
    echo -e "\n${PURPLE}Frontend エラー:${NC}"
    docker-compose logs frontend 2>/dev/null | grep -i error | tail -5 || echo "エラーログなし"
    
    # データベースのエラーログ
    echo -e "\n${PURPLE}Database エラー:${NC}"
    docker-compose logs db 2>/dev/null | grep -i error | tail -5 || echo "エラーログなし"
}

run_performance_test() {
    print_header "パフォーマンステスト"
    
    echo -e "${CYAN}🚀 API応答時間測定:${NC}"
    
    # ヘルスチェックエンドポイントの応答時間
    echo -n "Health check: "
    time_result=$(curl -o /dev/null -s -w "%{time_total}" http://localhost:3001/health 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}${time_result}秒${NC}"
    else
        echo -e "${RED}失敗${NC}"
    fi
    
    # 詳細ヘルスチェックの応答時間
    echo -n "Detailed health check: "
    time_result=$(curl -o /dev/null -s -w "%{time_total}" http://localhost:3001/health/detailed 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}${time_result}秒${NC}"
    else
        echo -e "${RED}失敗${NC}"
    fi
    
    # フロントエンドの応答時間
    echo -n "Frontend: "
    time_result=$(curl -o /dev/null -s -w "%{time_total}" http://localhost:3000 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}${time_result}秒${NC}"
    else
        echo -e "${RED}失敗${NC}"
    fi
}

# ========================================
# 🎯 メイン実行部分
# ========================================

main() {
    echo -e "${BLUE}"
    echo "  ██████╗ ██████╗ ███████╗ █████╗ ███╗   ███╗    ██╗      ██████╗  ██████╗ "
    echo "  ██╔══██╗██╔══██╗██╔════╝██╔══██╗████╗ ████║    ██║     ██╔═══██╗██╔════╝ "
    echo "  ██║  ██║██████╔╝█████╗  ███████║██╔████╔██║    ██║     ██║   ██║██║  ███╗"
    echo "  ██║  ██║██╔══██╗██╔══╝  ██╔══██║██║╚██╔╝██║    ██║     ██║   ██║██║   ██║"
    echo "  ██████╔╝██║  ██║███████╗██║  ██║██║ ╚═╝ ██║    ███████╗╚██████╔╝╚██████╔╝"
    echo "  ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝    ╚══════╝ ╚═════╝  ╚═════╝ "
    echo -e "${NC}"
    echo -e "${CYAN}📊 夢ログアプリケーション総合監視システム${NC}"
    echo -e "${CYAN}実行時刻: $(date '+%Y-%m-%d %H:%M:%S')${NC}\n"
    
    case "${1:-all}" in
        "containers"|"c")
            check_containers
            ;;
        "api"|"a")
            check_api_endpoints
            ;;
        "resources"|"r")
            check_system_resources
            ;;
        "logs"|"l")
            check_logs
            ;;
        "performance"|"p")
            run_performance_test
            ;;
        "all"|*)
            check_containers
            check_api_endpoints
            check_system_resources
            check_logs
            run_performance_test
            ;;
    esac
    
    echo -e "\n${GREEN}🎉 監視チェック完了${NC}"
    echo -e "${CYAN}💡 使用方法: $0 [containers|api|resources|logs|performance|all]${NC}\n"
}

# スクリプトの実行
main "$@"