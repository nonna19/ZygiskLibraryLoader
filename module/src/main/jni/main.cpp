#include <cstring>
#include <thread>
#include <fcntl.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>
#include <fstream>
#include <string>
#include <cinttypes>
#include "zygisk.hpp"
#include "json.hpp"
#include "log.h"
using zygisk::Api;
using zygisk::AppSpecializeArgs;
using zygisk::ServerSpecializeArgs;

class MyModule : public zygisk::ModuleBase {
public:
    void onLoad(Api *api, JNIEnv *env) override {
        this->api = api;
        this->env = env;
    }

    void preAppSpecialize(AppSpecializeArgs *args) override {
        auto package_name = env->GetStringUTFChars(args->nice_name, nullptr);
        auto app_data_dir = env->GetStringUTFChars(args->app_data_dir, nullptr);
        preSpecialize(package_name, app_data_dir);
        env->ReleaseStringUTFChars(args->nice_name, package_name);
        env->ReleaseStringUTFChars(args->app_data_dir, app_data_dir);
    }

    void postAppSpecialize(const AppSpecializeArgs *) override {
        if (enable_hack) {
            std::string libPath = std::string(game_data_dir) + "/libmain.so";
            LoadLibWithJVM(libPath);
        }
    }


private:
    Api *api;
    JNIEnv *env;
    bool enable_hack;
    char *game_data_dir;
    void *data;
    size_t length;

    bool LoadLibWithJVM(const std::string &libPath) {
        jclass systemClass = env->FindClass("java/lang/System");
        if (!systemClass) {
            LOGE("System class not found");
            return false;
        }

        jmethodID loadMethod = env->GetStaticMethodID(systemClass, "load", "(Ljava/lang/String;)V");
        if (!loadMethod) {
            LOGE("System.load method not found");
            return false;
        }

        jstring pathStr = env->NewStringUTF(libPath.c_str());
        env->CallStaticVoidMethod(systemClass, loadMethod, pathStr);
        env->DeleteLocalRef(pathStr);

        if (env->ExceptionCheck()) {
            env->ExceptionDescribe();
            env->ExceptionClear();
            LOGE("Exception while calling System.load");
            return false;
        }

        LOGI("System.load(\"%s\") succeeded", libPath.c_str());
        return true;
    }
    std::string getPathFromFd(int fd) {
        char buf[PATH_MAX];
        ssize_t len = readlink(("/proc/self/fd/" + std::to_string(fd)).c_str(), buf, sizeof(buf) - 1);
        if (len != -1) {
            buf[len] = '\0';
            return std::string(buf);
        }
        return ""; // error
    }

    std::string getConfigPath() {
        return getPathFromFd(api->getModuleDir()) + "/config.json";
    }

    std::string LoadFile(const std::string& path ) {
        std::ifstream file(path, std::ios::in | std::ios::binary);
        if (!file)
            return "";
        file.seekg(0, std::ios::end);
        std::string content;
        content.resize(file.tellg());
        file.seekg(0, std::ios::beg);
        file.read(&content[0], content.size());
        return content;
    }
    bool IsPackageEnabled(const nlohmann::json& cfg, const std::string& packageName) {
        try {
            if (!cfg.is_object()) return false;
            auto it = cfg.find(packageName);
            if (it == cfg.end()) return false;
            const nlohmann::json& entry = *it;
            if (!entry.is_object()) return false;
            if (!entry.contains("status")) return false;
            if (!entry["status"].is_boolean()) return false;
            return entry["status"].get<bool>();
        } catch (...) {
            return false;
        }
    }
    void preSpecialize(const char *package_name, const char *app_data_dir) {
        std::string package_name_str = std::string(package_name);

        std::string wholeConfig = LoadFile(getConfigPath());
        nlohmann::json jsonObject;
        try {
            jsonObject = nlohmann::json::parse(wholeConfig);
        } catch (...) {
            return;
        }

        if (IsPackageEnabled(jsonObject, package_name)) {
            LOGI("detect game: %s", package_name);
            enable_hack = true;
        } else {
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
        }
    }
};

REGISTER_ZYGISK_MODULE(MyModule)