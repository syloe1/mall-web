<template>
  <div class="container page">
    <div class="nf">
      <div class="nf-code">404</div>
      <h1 class="nf-title">页面走丢了</h1>
      <p class="nf-desc">你要找的页面不存在，或者地址有误。</p>
      <RouterLink to="/" class="btn btn-primary">回到首页</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.nf {
  text-align: center;
  padding: 90px 20px;
}

.nf-code {
  font-size: 88px;
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1;
  background: linear-gradient(135deg, var(--ink) 40%, var(--accent));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.nf-title {
  font-size: 22px;
  margin: 18px 0 8px;
}

.nf-desc {
  color: var(--ink-2);
  margin-bottom: 24px;
}
</style>
