<script setup lang="ts">
import { onPdaInput, pdaFields, pdaType, revealPdaType } from '~/composables/pdaFields'

function onInput(id: 'name' | 'mail' | 'subject' | 'msg', event: Event) {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  onPdaInput(id, target.value)
}
</script>

<template>
  <input
    v-show="pdaFields.show"
    class="field"
    type="text"
    autocomplete="name"
    :value="pdaType.on ? pdaType.name : pdaFields.name"
    :style="pdaFields.css.name"
    @pointerdown="revealPdaType"
    @focus="revealPdaType"
    @input="onInput('name', $event)"
  >
  <input
    v-show="pdaFields.show"
    class="field"
    type="email"
    autocomplete="email"
    :value="pdaType.on ? pdaType.mail : pdaFields.mail"
    :style="pdaFields.css.mail"
    @pointerdown="revealPdaType"
    @focus="revealPdaType"
    @input="onInput('mail', $event)"
  >
  <input
    v-show="pdaFields.show"
    class="field"
    type="text"
    autocomplete="off"
    :value="pdaType.on ? pdaType.subject : pdaFields.subject"
    :style="pdaFields.css.subject"
    @pointerdown="revealPdaType"
    @focus="revealPdaType"
    @input="onInput('subject', $event)"
  >
  <div
    v-show="pdaFields.show"
    class="msg"
    :style="pdaFields.css.msg"
    @pointerdown="revealPdaType"
  >
    <textarea
      class="msgIn"
      autocomplete="off"
      :value="pdaType.on ? pdaType.msg : pdaFields.msg"
      @focus="revealPdaType"
      @input="onInput('msg', $event)"
    />
  </div>
</template>

<style scoped lang="scss">
@font-face {
  font-family: Tektur;
  src: url('/fonts/Tektur.ttf') format('truetype');
  font-weight: 400 900;
  font-display: swap;
}

.field {
  position: fixed;
  z-index: 5;
  margin: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: #fff;
  caret-color: #fff;
  font-family: Tektur, sans-serif;
  font-weight: 500;
  box-sizing: border-box;
  resize: none;
  overflow: hidden;

  &::-webkit-scrollbar {
    display: none;
  }
}

.field,
.msgIn {
  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus,
  &:-webkit-autofill:active {
    -webkit-text-fill-color: #fff;
    caret-color: #fff;
    clip-path: inset(var(--pda-inset) round var(--pda-radius));
    box-shadow: 0 0 0 1000px #0000aa inset;
    transition: background-color 99999s ease-out;
  }

  &:-moz-autofill,
  &:autofill {
    color: #fff;
    caret-color: #fff;
    clip-path: inset(var(--pda-inset) round var(--pda-radius));
    background-color: #0000aa;
    box-shadow: 0 0 0 1000px #0000aa inset;
  }
}

.msg {
  position: fixed;
  z-index: 5;
  box-sizing: border-box;
  color: #fff;
  font-family: Tektur, sans-serif;
  font-weight: 500;
}

.msgIn {
  display: block;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: inherit;
  caret-color: #fff;
  font: inherit;
  line-height: inherit;
  resize: none;
  overflow: hidden;
}
</style>
