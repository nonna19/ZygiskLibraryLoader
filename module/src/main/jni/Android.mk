
LOCAL_PATH := $(call my-dir)


include $(CLEAR_VARS)
LOCAL_MODULE    := loader

LOCAL_CFLAGS := -g -Wno-error=format-security -fvisibility=hidden -ffunction-sections -fdata-sections -w -frtti -fno-exceptions -fpermissive
LOCAL_CPPFLAGS := -g -Wno-error=format-security -fvisibility=hidden -ffunction-sections -fdata-sections -w -Werror -std=c++17 -frtti -Wno-error=c++11-narrowing -fms-extensions -fno-exceptions -fpermissive
LOCAL_LDFLAGS := -Wl,--gc-sections
LOCAL_ARM_MODE := arm


# Enable C++ exceptions
LOCAL_CPP_FEATURES := exceptions


LOCAL_C_INCLUDES += $(LOCAL_PATH)

LOCAL_SRC_FILES := main.cpp

LOCAL_LDLIBS := -llog -landroid

include $(BUILD_SHARED_LIBRARY)
