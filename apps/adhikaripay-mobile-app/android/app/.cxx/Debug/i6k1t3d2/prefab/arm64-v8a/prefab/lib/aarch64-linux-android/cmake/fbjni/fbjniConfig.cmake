if(NOT TARGET fbjni::fbjni)
add_library(fbjni::fbjni SHARED IMPORTED)
set_target_properties(fbjni::fbjni PROPERTIES
    IMPORTED_LOCATION "/private/var/folders/3r/gwlm7rqs21z478_1lwtq46d80000gn/T/cursor-sandbox-cache/6abfe09323799e6d149e7842b3e5b113/gradle/caches/8.10.2/transforms/ecaf85af74491e145fd7c1a1474ff70a/transformed/fbjni-0.6.0/prefab/modules/fbjni/libs/android.arm64-v8a/libfbjni.so"
    INTERFACE_INCLUDE_DIRECTORIES "/private/var/folders/3r/gwlm7rqs21z478_1lwtq46d80000gn/T/cursor-sandbox-cache/6abfe09323799e6d149e7842b3e5b113/gradle/caches/8.10.2/transforms/ecaf85af74491e145fd7c1a1474ff70a/transformed/fbjni-0.6.0/prefab/modules/fbjni/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

