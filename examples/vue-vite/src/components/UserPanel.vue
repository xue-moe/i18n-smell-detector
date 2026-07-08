<template>
  <section class="user-panel">
    <h1>Profile settings</h1>
    <p>No results found</p>
    <input placeholder="Search" title="Search users" />
    <button>Save</button>
    <span>OK</span>
    <span>v2</span>
    <span>#ffffff</span>
    <button :title="closeLabel">{{ closeLabel }}</button>
  </section>
</template>

<script setup>
const closeLabel = 'Close';
</script>
