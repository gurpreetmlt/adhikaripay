if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "/private/var/folders/3r/gwlm7rqs21z478_1lwtq46d80000gn/T/cursor-sandbox-cache/6abfe09323799e6d149e7842b3e5b113/gradle/caches/8.10.2/transforms/29c3d96c9dc7a67f62fbcfaad336dc61/transformed/hermes-android-0.76.9-debug/prefab/modules/libhermes/libs/android.x86_64/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "/private/var/folders/3r/gwlm7rqs21z478_1lwtq46d80000gn/T/cursor-sandbox-cache/6abfe09323799e6d149e7842b3e5b113/gradle/caches/8.10.2/transforms/29c3d96c9dc7a67f62fbcfaad336dc61/transformed/hermes-android-0.76.9-debug/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

